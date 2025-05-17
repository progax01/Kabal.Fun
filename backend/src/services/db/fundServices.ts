import fundModel, { IFund } from "../../models/fundModel";
import ledgerModel from "../../models/ledgerModel";
import { ICreateFundData } from "../../helpers/types/fundTypes";
import { PipelineStage } from "mongoose";
import Ledger from "../../models/ledgerModel";
import { BigNumber } from "bignumber.js";
import AssetValuationService from "../price/assetValuationService";
import userModel from "../../models/userModel";
import { Types } from "mongoose";
import FundPriceHistory from "../../models/fundPriceHistoryModel";

class fundServices {
  static getAllFunds = async (page, limit) => {
    try {
      const pageNo = page || 1;
      const itemsLimit = limit || 3;
      const funds = await fundModel
        .find()
        .populate("managerId", "walletAddress socials")
        .skip((pageNo - 1) * itemsLimit)
        .limit(itemsLimit);

      const enhancedFunds = await this.enhanceFundsWithMetrics(funds);
      const fundsCount = await fundModel.countDocuments();

      return {
        funds: enhancedFunds,
        fundsCount,
      };
    } catch (err: any) {
      throw new Error(`Error while getting all funds: ${err.message}`);
    }
  };

  static createFund = async (data: ICreateFundData) => {
    try {
      return await fundModel.create(data);
    } catch (err: any) {
      throw new Error(`Error while saving fund: ${err.message}`);
    }
  };

  static getFundByAddress = async (fundAddress: string) => {
    try {
      return await fundModel
        .findOne({
          fundContractAddress: fundAddress,
        })
        .populate("managerId", "walletAddress socials");
    } catch (err: any) {
      throw new Error(`Error while getting fund by address: ${err.message}`);
    }
  };

  static async getTrendingFunds(page: number = 1, limit: number = 10) {
    try {
      // First, get all funds with recent ledger activity
      const fundsWithActivity = await Ledger.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$fundId", lastActivity: { $first: "$timestamp" } } },
        { $sort: { lastActivity: -1 } },
        // Remove the limit and skip here to get all active funds
      ]);

      const fundIds = fundsWithActivity.map((f) => f._id);

      // Get the actual fund documents for funds with activity
      let funds = [];
      if (fundIds.length > 0) {
        funds = await fundModel
          .find({ _id: { $in: fundIds }, isActive: true })
          .populate("managerId", "walletAddress socials")
          .sort({ createdAt: -1 });
      }

      // If we don't have enough funds with activity, add other active funds
      const allActiveFunds = await fundModel
        .find({ isActive: true })
        .populate("managerId", "walletAddress socials")
        .sort({ createdAt: -1 });

      // Combine funds with activity and other active funds, removing duplicates
      const existingIds = new Set(funds.map((f) => f._id.toString()));
      const additionalFunds = allActiveFunds.filter(
        (f) => !existingIds.has(f._id.toString())
      );

      const combinedFunds = [...funds, ...additionalFunds];

      // Enhance funds with metrics
      const enhancedFunds = await this.enhanceFundsWithMetrics(combinedFunds);

      // Get total count for pagination
      const fundsCount = await fundModel.countDocuments({ isActive: true });

      // Apply pagination after all processing
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFunds = enhancedFunds.slice(startIndex, endIndex);

      return { funds: paginatedFunds, fundsCount };
    } catch (error: any) {
      throw new Error(`Error getting trending funds: ${error.message}`);
    }
  }

  static async searchFunds(
    searchText: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const funds = await fundModel
      .searchByName(searchText)
      .skip(skip)
      .limit(limit);

    const count = await fundModel.countDocuments({
      $or: [
        { fundName: new RegExp(searchText, "i") },
        { $text: { $search: searchText } },
      ],
    });

    return {
      funds,
      count,
      page,
      limit,
    };
  }

  static async getFundsByNamePattern(
    pattern: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const funds = await fundModel
      .find({
        fundName: new RegExp(pattern, "i"),
      })
      .collation({ locale: "en", strength: 2 })
      .skip(skip)
      .limit(limit)
      .sort({ fundName: 1 });

    const count = await fundModel.countDocuments({
      fundName: new RegExp(pattern, "i"),
    });

    return {
      funds,
      count,
      page,
      limit,
    };
  }

  /**
   * Get fundraising funds with progress information
   */
  static async getFundraisingFunds(
    page: number = 1,
    limit: number = 10,
    sort: string = "newest"
  ) {
    try {
      // Determine sort order for database query
      let sortOption = {};

      // These sorts can be done directly in the database
      switch (sort) {
        case "oldest":
          sortOption = { createdAt: 1 };
          break;
        case "target-high":
          sortOption = { targetRaiseAmount: -1 };
          break;
        case "target-low":
          sortOption = { targetRaiseAmount: 1 };
          break;
        case "newest":
        default:
          sortOption = { createdAt: -1 };
      }

      // Get all fundraising funds (we'll handle pagination after sorting)
      const funds = await fundModel
        .find({
          fundStatus: "fundraising",
          isActive: true,
        })
        .populate("managerId", "walletAddress socials")
        .sort(sortOption);

      // Enhance funds with metrics
      const enhancedFunds = await this.enhanceFundsWithMetrics(funds);

      // Handle special sorting cases that require calculated fields
      if (sort === "progress-high") {
        enhancedFunds.sort(
          (a, b) =>
            parseFloat(b.progress.percentage) -
            parseFloat(a.progress.percentage)
        );
      } else if (sort === "progress-low") {
        enhancedFunds.sort(
          (a, b) =>
            parseFloat(a.progress.percentage) -
            parseFloat(b.progress.percentage)
        );
      }

      // Apply pagination after sorting
      const skip = (page - 1) * limit;
      const paginatedFunds = enhancedFunds.slice(skip, skip + limit);

      const fundsCount = await fundModel.countDocuments({
        fundStatus: "fundraising",
        isActive: true,
      });

      return { funds: paginatedFunds, fundsCount };
    } catch (error: any) {
      throw new Error(`Error getting fundraising funds: ${error.message}`);
    }
  }

  /**
   * Get trading funds with performance metrics
   */
  static async getTradingFunds(
    page: number = 1,
    limit: number = 10,
    sort: string = "newest"
  ) {
    try {
      const skip = (page - 1) * limit;

      // Determine sort order
      let sortOption = {};
      switch (sort) {
        case "oldest":
          sortOption = { createdAt: 1 };
          break;
        case "newest":
        default:
          sortOption = { createdAt: -1 };
      }

      // Get trading funds
      const funds = await fundModel
        .find({
          fundStatus: "trading",
          isActive: true,
        })
        .populate("managerId", "walletAddress socials")
        .sort(sortOption);

      // Enhance funds with metrics
      const enhancedFunds = await this.enhanceFundsWithMetrics(funds);

      // Handle special sorting cases for performance metrics
      if (sort === "price-high") {
        enhancedFunds.sort(
          (a, b) =>
            parseFloat(b.performance.tokenPrice) -
            parseFloat(a.performance.tokenPrice)
        );
      } else if (sort === "price-low") {
        enhancedFunds.sort(
          (a, b) =>
            parseFloat(a.performance.tokenPrice) -
            parseFloat(b.performance.tokenPrice)
        );
      } else if (sort === "aum-high") {
        enhancedFunds.sort(
          (a, b) =>
            parseFloat(b.performance.aum) - parseFloat(a.performance.aum)
        );
      } else if (sort === "aum-low") {
        enhancedFunds.sort(
          (a, b) =>
            parseFloat(a.performance.aum) - parseFloat(b.performance.aum)
        );
      }

      // Apply pagination after sorting
      const paginatedFunds = enhancedFunds.slice(skip, skip + limit);

      const fundsCount = await fundModel.countDocuments({
        fundStatus: "trading",
        isActive: true,
      });

      return { funds: paginatedFunds, fundsCount };
    } catch (error: any) {
      throw new Error(`Error getting trading funds: ${error.message}`);
    }
  }

  static getFundsByManager = async (managerId: string) => {
    try {
      return await fundModel.find({ managerId });
    } catch (err: any) {
      throw new Error(`Error while getting funds by manager: ${err.message}`);
    }
  };

  /**
   * Enhance multiple funds with metrics
   * @private
   */
  private static async enhanceFundsWithMetrics(funds: any[]): Promise<any[]> {
    try {
      // First, populate the manager details if not already populated
      const populatedFunds = await Promise.all(
        funds.map(async (fund) => {
          let fundObj = fund;

          // If fund is a Mongoose document, convert to plain object
          if (typeof fund.toObject === "function") {
            fundObj = fund.toObject();
          }

          // If managerId is just an ID and not populated, populate it
          if (fundObj.managerId && typeof fundObj.managerId === "string") {
            const manager: any = await userModel
              .findById(fundObj.managerId)
              // Use only inclusion (positive) projection
              .select("walletAddress socials")
              .lean();

            if (manager) {
              // Filter out sensitive fields manually after query
              delete manager.authToken;
              delete manager.nonce;

              // Format manager socials
              if (manager.socials) {
                manager.socials = manager.socials.map((social) => ({
                  social: social.social,
                  followers: social.followers,
                  image: social.image,
                }));
              }

              fundObj.manager = manager;
            }
          } else if (
            fundObj.managerId &&
            typeof fundObj.managerId === "object"
          ) {
            // If already populated but needs formatting
            const manager = { ...fundObj.managerId };

            // Format manager socials
            if (manager.socials) {
              manager.socials = manager.socials.map((social) => ({
                social: social.social,
                followers: social.followers,
                image: social.image,
              }));
            }

            fundObj.manager = manager;
          }

          return fundObj;
        })
      );

      // Continue with the existing metrics enhancement
      // ... (rest of the method)

      return populatedFunds;
    } catch (error) {
      console.error("Error enhancing funds with metrics:", error);
      return funds; // Return original funds if enhancement fails
    }
  }

  /**
   * Get the fund with the highest performance gain
   * @returns The fund with the highest performance gain
   */
  static async getMostGainingFund() {
    try {
      // Get all trading funds
      const tradingFunds = await fundModel
        .find({
          fundStatus: "trading",
          isActive: true,
        })
        .populate("managerId", "walletAddress socials");

      if (tradingFunds.length === 0) {
        return null;
      }

      // Enhance funds with performance metrics
      const enhancedFunds = [];

      for (const fund of tradingFunds) {
        // Calculate token price
        const tokenPrice = await AssetValuationService.calculateFundTokenPrice(
          fund.assets || [],
          fund.fundTokens || "0"
        );

        // Get AUM in SOL
        const aumInSOL =
          await AssetValuationService.calculateTotalAssetValueInSOL(
            fund.assets || []
          );

        // Get SOL price in USD
        const tokenAddresses = fund.assets.map((asset) => asset.tokenAddress);
        const latestPrices = await AssetValuationService.getLatestTokenPrices(
          tokenAddresses
        );
        const solPrice = latestPrices[process.env.SOL_TOKEN_ADDRESS || ""];

        // Calculate AUM in USD
        const aumInUSD = new BigNumber(aumInSOL)
          .multipliedBy(new BigNumber(solPrice || "0"))
          .toString();

        const fundObj = fund.toObject();

        // Add performance metrics
        fundObj.performance = {
          tokenPrice,
          aum: aumInSOL,
        };

        // Add progress metrics (for consistency)
        const solAsset = fund.assets?.find(
          (asset) => asset.tokenAddress === process.env.SOL_TOKEN_ADDRESS
        );

        const currentAmount = solAsset ? solAsset.amount : "0";
        const targetAmount = fund.targetRaiseAmount || "0";

        // Calculate progress percentage
        const progress = new BigNumber(targetAmount).isGreaterThan(0)
          ? new BigNumber(currentAmount)
              .dividedBy(new BigNumber(targetAmount))
              .multipliedBy(100)
              .toFixed(2)
          : "0";

        fundObj.progress = {
          current: currentAmount,
          target: targetAmount,
          percentage: progress,
        };

        enhancedFunds.push(fundObj);
      }

      // Sort by token price (highest first) as a simple measure of performance
      enhancedFunds.sort((a, b) => {
        if (a.performance?.tokenPrice && b.performance?.tokenPrice) {
          return (
            parseFloat(b.performance.tokenPrice) -
            parseFloat(a.performance.tokenPrice)
          );
        }
        return 0;
      });

      // Return the top performing fund
      return enhancedFunds[0];
    } catch (error) {
      console.error("Error getting most gaining fund:", error);
      throw new Error(`Error getting most gaining fund: ${error.message}`);
    }
  }

  /**
   * Get funds for leaderboard
   * This function retrieves all active trading funds for the leaderboard
   */
  static async getFundsForLeaderboard(page: number = 1, limit: number = 10) {
    try {
      // Get count of all active trading funds
      const fundsCount = await fundModel.countDocuments({
        fundStatus: "trading",
        isActive: true,
      });

      // Get all active trading funds
      // We don't apply sorting here as it will be done in the controller
      // after calculating performance metrics
      const funds = await fundModel
        .find({
          fundStatus: "trading",
          isActive: true,
        })
        .populate("managerId", "walletAddress socials")
        .lean();

      return { funds, fundsCount };
    } catch (error: any) {
      throw new Error(`Error getting funds for leaderboard: ${error.message}`);
    }
  }

  /**
   * Get initial AUM of a fund
   */
  static async getInitialAUM(fundId: string): Promise<BigNumber> {
    try {
      // Get the first price history entry
      const firstPriceHistory = await FundPriceHistory.findOne({
        fundId: new Types.ObjectId(fundId),
      })
        .sort({ timestamp: 1 })
        .lean();

      return firstPriceHistory
        ? new BigNumber(firstPriceHistory.aum)
        : new BigNumber(0);
    } catch (error) {
      console.error(`Error getting initial AUM: ${error}`);
      return new BigNumber(0);
    }
  }

  /**
   * Get average entry price for an asset
   */
  static async getAssetAverageEntryPrice(
    fundId: string,
    tokenAddress: string
  ): Promise<string> {
    try {
      // Get all buy transactions for this asset
      const buyTransactions = await ledgerModel
        .find({
          fundId: new Types.ObjectId(fundId),
          tokenAddress,
          method: "buy",
        })
        .lean();

      if (buyTransactions.length === 0) {
        return "0";
      }

      // Calculate weighted average price
      let totalQuantity = new BigNumber(0);
      let totalValue = new BigNumber(0);

      buyTransactions.forEach((tx) => {
        const quantity = new BigNumber(tx.amount);
        const price = new BigNumber(tx.price);

        totalQuantity = totalQuantity.plus(quantity);
        totalValue = totalValue.plus(quantity.multipliedBy(price));
      });

      return totalQuantity.isGreaterThan(0)
        ? totalValue.dividedBy(totalQuantity).toString()
        : "0";
    } catch (error) {
      console.error(`Error getting average entry price: ${error}`);
      return "0";
    }
  }

  /**
   * Get enhanced funds using aggregation pipeline
   */
  static async getEnhancedFunds(
    filter: any = {},
    sortBy: any = { createdAt: -1 },
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // Base pipeline for all fund queries
      const pipeline: PipelineStage[] = [
        // Stage 1: Match the filter criteria
        { $match: filter },

        // Stage 2: Lookup manager data
        {
          $lookup: {
            from: "users",
            localField: "managerId",
            foreignField: "_id",
            as: "managerData",
          },
        },

        // Stage 3: Unwind manager data (convert array to object)
        {
          $unwind: {
            path: "$managerData",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Stage 4: Lookup fund price history (latest entry)
        {
          $lookup: {
            from: "fundpricehistories",
            let: { fundId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$fundId", "$$fundId"] },
                },
              },
              { $sort: { timestamp: -1 } },
              { $limit: 1 },
            ],
            as: "latestPriceData",
          },
        },

        // Stage 5: Lookup previous price data (closest to 24h ago)
        {
          $lookup: {
            from: "fundpricehistories",
            let: { fundId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$fundId", "$$fundId"] },
                      {
                        $lt: [
                          "$timestamp",
                          { $subtract: [new Date(), 24 * 60 * 60 * 1000] },
                        ],
                      },
                    ],
                  },
                },
              },
              { $sort: { timestamp: -1 } }, // Get the most recent before 24h ago
              { $limit: 1 },
              { $project: { tokenPrice: 1, aum: 1, _id: 0 } },
            ],
            as: "previousPriceData",
          },
        },

        // Add another lookup for oldest data as fallback
        {
          $lookup: {
            from: "fundpricehistories",
            let: { fundId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$fundId", "$$fundId"] } } },
              { $sort: { timestamp: 1 } }, // Sort by oldest first
              { $limit: 1 },
              { $project: { tokenPrice: 1, aum: 1, _id: 0 } },
            ],
            as: "oldestPriceData",
          },
        },

        // Stage 6: Project fields we need
        {
          $project: {
            _id: 1,
            fundName: 1,
            fundTicker: 1,
            fundDescription: 1,
            fundLogoUrl: 1,
            targetRaiseAmount: 1,
            fundStatus: 1,
            assets: 1,
            onChainFundId: 1,
            fundTokens: 1,
            annualManagementFee: 1,
            fundContractAddress: 1,
            fundTokenAddress: 1,
            createdAt: 1,
            isActive: 1,
            manager: {
              _id: "$managerData._id",
              walletAddress: "$managerData.walletAddress",
              socials: "$managerData.socials",
            },
            performance: {
              tokenPrice: { $arrayElemAt: ["$latestPriceData.tokenPrice", 0] },
              aum: { $arrayElemAt: ["$latestPriceData.aum", 0] },
            },
            previousPerformance: {
              $cond: {
                if: { $gt: [{ $size: "$previousPriceData" }, 0] },
                then: {
                  tokenPrice: {
                    $arrayElemAt: ["$previousPriceData.tokenPrice", 0],
                  },
                  aum: { $arrayElemAt: ["$previousPriceData.aum", 0] },
                },
                else: {
                  tokenPrice: {
                    $arrayElemAt: ["$oldestPriceData.tokenPrice", 0],
                  },
                  aum: { $arrayElemAt: ["$oldestPriceData.aum", 0] },
                },
              },
            },
          },
        },

        // Stage 7: Add calculated fields
        {
          $addFields: {
            priceChange: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$performance.tokenPrice", null] },
                    { $ne: ["$previousPerformance.tokenPrice", null] },
                    { $ne: ["$previousPerformance.tokenPrice", "0"] },
                  ],
                },
                then: {
                  value: {
                    $subtract: [
                      { $toDouble: "$performance.tokenPrice" },
                      { $toDouble: "$previousPerformance.tokenPrice" },
                    ],
                  },
                  percentage: {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              { $toDouble: "$performance.tokenPrice" },
                              { $toDouble: "$previousPerformance.tokenPrice" },
                            ],
                          },
                          { $toDouble: "$previousPerformance.tokenPrice" },
                        ],
                      },
                      100,
                    ],
                  },
                },
                else: { value: "0", percentage: "0" },
              },
            },
            aumChange: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$performance.aum", null] },
                    { $ne: ["$previousPerformance.aum", null] },
                    { $ne: ["$previousPerformance.aum", "0"] },
                  ],
                },
                then: {
                  value: {
                    $subtract: [
                      { $toDouble: "$performance.aum" },
                      { $toDouble: "$previousPerformance.aum" },
                    ],
                  },
                  percentage: {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              { $toDouble: "$performance.aum" },
                              { $toDouble: "$previousPerformance.aum" },
                            ],
                          },
                          { $toDouble: "$previousPerformance.aum" },
                        ],
                      },
                      100,
                    ],
                  },
                },
                else: { value: "0", percentage: "0" },
              },
            },
          },
        },

        // Stage 8: Apply sorting
        { $sort: sortBy },

        // Stage 9: Skip for pagination
        { $skip: skip },

        // Stage 10: Limit results
        { $limit: limit },
      ];

      // Execute the pipeline
      const funds = await fundModel.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = [{ $match: filter }, { $count: "total" }];
      const countResult = await fundModel.aggregate(countPipeline);
      const fundsCount = countResult.length > 0 ? countResult[0].total : 0;

      return { funds, fundsCount };
    } catch (error: any) {
      throw new Error(`Error getting enhanced funds: ${error.message}`);
    }
  }

  static async getFundById(fundId: string) {
    try {
      return await fundModel.findById(fundId);
    } catch (error) {
      console.error(`Error getting fund by ID ${fundId}:`, error);
      throw new Error(`Failed to get fund: ${error.message}`);
    }
  }
}

export default fundServices;
