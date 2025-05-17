import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import fundServices from "../services/db/fundServices";
import mongoose from "mongoose";
import userServices from "../services/db/userServices";
import crypto from "crypto";
import { FundCleanupService } from "../services/fundCleanupService";
import { FundStatus, ICreateFundData } from "../helpers/types/fundTypes";
import BigNumber from "bignumber.js";
import AssetValuationService from "../services/price/assetValuationService";
import fs from "fs";
import cloudflareImageService from "../services/cloudflare/cloudflareImageService";
import path from "path";
import os from "os";
import userModel from "../models/userModel";
import {
  enhanceFundWithDetails,
  getSOLPrice,
  getManagerDetails,
  calculatePerformanceMetrics,
  calculateProgressMetrics,
  getFundPriceHistory,
} from "../utils/fundUtils";
import FundRankingHistory from "../models/fundRankingHistoryModel";
import FundRankingService from "../services/db/fundRankingService";
import tokenRegistryService from "../services/db/tokenRegistryService";
import userHoldingServices from "../services/db/userHoldingServices";
import marketCapService from "../services/price/marketCapService";
import {
  validateBigNumberString,
  isLessThan,
  isGreaterOrEqual,
  subtractBigNumbers,
} from "../utils/bigNumberUtils";
import envConfigs from "../configs/envConfigs";
import telegramGroupService from "../services/telegram/telegramGroupService";

class fundController {
  static createFundUniqueId = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { walletAddress } = req.params;
      const combinedString = `${walletAddress}:${Date.now().toString()}`;
      const uniqueId = crypto
        .createHash("sha256")
        .update(combinedString)
        .digest("hex");
      res.status(200).json({
        success: true,
        uniqueId,
      });
    }
  );

  static createFund = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {
          managerAddress,
          fundName,
          fundTicker,
          fundDescription,
          targetRaiseAmount,
          annualManagementFee,
          onChainFundId,
          fundContractAddress,
          fundTokenAddress,
          websiteUrl,
          telegramUrl,
          twitterHandle,
          managerTelegramUsername,
        } = req.body;

        // Validate required file upload
        if (!req.file) {
          return next(errorHandler(401, "Fund logo is required."));
        }

        // Use a temporary file approach
        const tempFilePath = path.join(
          os.tmpdir(),
          `${Date.now()}_${req.file.originalname}`
        );
        fs.writeFileSync(tempFilePath, req.file.buffer);

        let fundLogoUrl;
        try {
          fundLogoUrl = await cloudflareImageService.uploadImageFromPath(
            tempFilePath
          );
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
        } catch (error) {
          console.error("Error uploading fund logo:", error);
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          fundLogoUrl = "https://via.placeholder.com/150";
        }

        // Validate manager exists
        const manager = await userServices.getUserByAddress(managerAddress);
        if (!manager) {
          return next(errorHandler(401, "Fund manager not found."));
        }

        // Create Telegram group for the fund
        let telegramGroup = null;
        try {
          telegramGroup = await telegramGroupService.createFundGroup(
            fundName,
            managerTelegramUsername
          );
        } catch (error) {
          console.error("Failed to create Telegram group:", error);
          // Continue without Telegram group if it fails
        }

        const fundData: ICreateFundData = {
          managerId: manager._id,
          fundName,
          fundTicker,
          fundDescription,
          fundLogoUrl,
          targetRaiseAmount,
          annualManagementFee,
          onChainFundId,
          fundContractAddress: fundContractAddress,
          fundTokenAddress: fundTokenAddress,
          websiteUrl,
          telegramUrl,
          twitterHandle,
          fundStatus: "fundraising" as FundStatus,
          isActive: true,
          managerTelegramUsername,
          telegramGroupId: telegramGroup?.groupId,
          telegramGroupTitle: telegramGroup?.groupTitle,
          // createdAt and deadlines will be set by schema defaults
        };

        const fund = await fundServices.createFund(fundData);

        return res.status(201).json({
          success: true,
          message: "Fund has been created successfully.",
          fund,
          telegramGroup: telegramGroup,
        });
      } catch (error) {
        console.error("Error creating fund:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to create fund",
        });
      }
    }
  );
  static getFunds = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page = 1, limit = 10, filter, sort } = req.query;

      // Step 1: Determine query filter and sort options
      const {
        queryFilter,
        sortBy,
        needsPostSort,
        postSortField,
        postSortDirection,
      } = this.getFundQueryOptions(filter as string, sort as string);

      // Step 2: Fetch funds using aggregation
      const { funds, fundsCount } = await fundServices.getEnhancedFunds(
        queryFilter,
        sortBy,
        Number(page),
        Number(limit)
      );

      // Step 3: Get token prices for all assets
      const { tokenPrices, solPrice } = await this.getTokenPrices(funds);

      // Step 4: Enhance funds with market values and metrics
      let enhancedFunds = await this.enhanceFundsWithMarketValues(
        funds,
        tokenPrices,
        solPrice
      );

      // Step 5: Apply post-processing sort if needed
      if (needsPostSort && postSortField) {
        enhancedFunds = this.applyPostProcessingSort(
          enhancedFunds,
          postSortField,
          postSortDirection
        );
      }

      res.status(200).json({
        success: true,
        funds: enhancedFunds,
        fundsCount,
      });
    }
  );

  // Helper function to determine query filter and sort options
  private static getFundQueryOptions(filter: string, sort: string) {
    let queryFilter: any = {};
    let sortBy: any = { createdAt: -1 }; // Default sort
    let needsPostSort = false;
    let postSortField = "";
    let postSortDirection = "desc";

    // Handle different filter types
    if (!filter || filter === "trending") {
      queryFilter = { isActive: true };
      sortBy = { createdAt: -1 };
    } else if (filter === "fundraising") {
      queryFilter = { fundStatus: "fundraising", isActive: true };

      // Apply custom sorting if provided
      switch (sort) {
        case "oldest":
          sortBy = { createdAt: 1 };
          break;
        case "target-high":
          sortBy = { targetRaiseAmount: -1 };
          break;
        case "target-low":
          sortBy = { targetRaiseAmount: 1 };
          break;
        case "progress-high":
          needsPostSort = true;
          postSortField = "progress.percentage";
          postSortDirection = "desc";
          break;
        case "progress-low":
          needsPostSort = true;
          postSortField = "progress.percentage";
          postSortDirection = "asc";
          break;
        case "newest":
        default:
          sortBy = { createdAt: -1 };
      }
    } else if (filter === "trading") {
      queryFilter = { fundStatus: "trading", isActive: true };

      // Apply custom sorting if provided
      switch (sort) {
        case "oldest":
          sortBy = { createdAt: 1 };
          break;
        case "price-high":
          needsPostSort = true;
          postSortField = "performance.tokenPrice.sol";
          postSortDirection = "desc";
          break;
        case "price-low":
          needsPostSort = true;
          postSortField = "performance.tokenPrice.sol";
          postSortDirection = "asc";
          break;
        case "aum-high":
          needsPostSort = true;
          postSortField = "performance.aum.sol";
          postSortDirection = "desc";
          break;
        case "aum-low":
          needsPostSort = true;
          postSortField = "performance.aum.sol";
          postSortDirection = "asc";
          break;
        case "performance":
          needsPostSort = true;
          postSortField = "priceChange.percentage";
          postSortDirection = "desc";
          break;
        case "newest":
        default:
          sortBy = { createdAt: -1 };
      }
    }

    return {
      queryFilter,
      sortBy,
      needsPostSort,
      postSortField,
      postSortDirection,
    };
  }

  // Helper function to get token prices
  private static async getTokenPrices(funds: any[]) {
    // Collect all unique token addresses from all funds
    const tokenAddresses = new Set<string>();
    funds.forEach((fund) => {
      if (fund.assets && Array.isArray(fund.assets)) {
        fund.assets.forEach((asset) => {
          if (asset.tokenAddress) {
            tokenAddresses.add(asset.tokenAddress);
          }
        });
      }
    });

    // Get token prices for all unique tokens
    const tokenPrices = await tokenRegistryService.getTokenPrices(
      Array.from(tokenAddresses)
    );

    // Get SOL price in USD for conversion
    const solPrice =
      tokenPrices[
        process.env.SOL_TOKEN_ADDRESS ||
          "So11111111111111111111111111111111111111112"
      ] || "0";

    return { tokenPrices, solPrice };
  }

  // Helper function to enhance funds with market values
  private static enhanceFundsWithMarketValues(
    funds: any[],
    tokenPrices: Record<string, string>,
    solPrice: string
  ) {
    return funds.map((fund) => {
      // Enhance assets with market values
      if (fund.assets && Array.isArray(fund.assets)) {
        fund.assets = this.enhanceAssetsWithMarketValues(
          fund.assets,
          tokenPrices,
          solPrice
        );
      }

      // Calculate total AUM in USD and SOL
      const { aumUSD, aumSOL } = this.calculateTotalAUM(fund.assets);

      // Format performance metrics with nested sol/usd structure
      fund.performance = this.formatPerformanceMetrics(
        fund.performance,
        aumSOL,
        aumUSD,
        solPrice
      );

      // Calculate price change
      if (fund.performance && fund.performance.tokenPrice) {
        fund.priceChange = this.formatPriceChange(fund.priceChange, solPrice);
      }

      // Calculate AUM change
      if (fund.performance && fund.performance.aum) {
        fund.aumChange = this.formatAUMChange(fund.aumChange, solPrice);
      }

      // Calculate progress for fundraising funds
      if (fund.fundStatus === "fundraising" && fund.targetRaiseAmount) {
        fund.progress = this.calculateFundProgress(
          fund.targetRaiseAmount,
          aumSOL,
          aumUSD,
          solPrice
        );
      }

      return fund;
    });
  }

  // Helper function to get previous price data for funds
  private static async getPreviousPriceData(
    fundIds: string[]
  ): Promise<Record<string, { tokenPrice: string; aum: string }>> {
    try {
      // Import the FundPriceHistory model
      const FundPriceHistory =
        require("../models/fundPriceHistoryModel").default;

      // Calculate date 24 hours ago
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Get price history entries closest to 24 hours ago for each fund
      const priceHistoryEntries = await Promise.all(
        fundIds.map(async (fundId) => {
          // Find the closest entry to 24 hours ago
          const entry = await FundPriceHistory.findOne({
            fundId,
            timestamp: { $lte: oneDayAgo },
          })
            .sort({ timestamp: -1 })
            .lean();

          return { fundId, entry };
        })
      );

      // Convert to a map for easy lookup
      const result: Record<string, { tokenPrice: string; aum: string }> = {};

      priceHistoryEntries.forEach(({ fundId, entry }) => {
        if (entry) {
          result[fundId] = {
            tokenPrice: entry.tokenPrice || "0",
            aum: entry.aum || "0",
          };
        }
      });

      return result;
    } catch (error) {
      console.error("Error fetching previous price data:", error);
      return {};
    }
  }

  // Helper function to enhance assets with market values
  private static enhanceAssetsWithMarketValues(
    assets: any[],
    tokenPrices: Record<string, string>,
    solPrice: string
  ) {
    return assets.map((asset) => {
      const tokenPrice = tokenPrices[asset.tokenAddress] || "0";
      const amount = asset.amount || "0";

      // Calculate market value in USD
      const marketValue = new BigNumber(amount)
        .multipliedBy(tokenPrice)
        .toString();

      // Calculate market value in SOL
      const marketValueSOL = new BigNumber(solPrice).isGreaterThan(0)
        ? new BigNumber(marketValue).dividedBy(solPrice).toString()
        : "0";

      return {
        ...asset,
        price: tokenPrice,
        marketValue,
        marketValueSOL,
      };
    });
  }

  // Helper function to calculate total AUM
  private static calculateTotalAUM(assets: any[]) {
    let aumUSD = new BigNumber(0);
    let aumSOL = new BigNumber(0);

    if (assets && Array.isArray(assets)) {
      assets.forEach((asset) => {
        // For SOL value
        if (asset.marketValueSOL) {
          aumSOL = aumSOL.plus(new BigNumber(asset.marketValueSOL));
        }

        // For USD value (if available)
        if (asset.marketValueUSD) {
          aumUSD = aumUSD.plus(new BigNumber(asset.marketValueUSD));
        } else if (asset.marketValue) {
          // If marketValueUSD is not available but marketValue is (which is in USD)
          aumUSD = aumUSD.plus(new BigNumber(asset.marketValue));
        }
      });
    }

    return { aumUSD, aumSOL };
  }

  // Helper function to format performance metrics
  private static formatPerformanceMetrics(
    performance: any,
    aumSOL: BigNumber,
    aumUSD: BigNumber,
    solPrice: string
  ) {
    if (!performance) return null;

    // Convert SOL AUM to USD with high precision
    const aumSOLValue = aumSOL.toString();
    const aumUSDValue = new BigNumber(aumSOLValue)
      .multipliedBy(new BigNumber(solPrice))
      .toString();

    return {
      tokenPrice: {
        sol: performance.tokenPrice || "0",
        usd: new BigNumber(performance.tokenPrice || "0")
          .multipliedBy(solPrice)
          .toString(),
      },
      aum: {
        sol: aumSOLValue,
        usd: aumUSDValue,
      },
    };
  }

  // Helper function to format price change
  private static formatPriceChange(priceChange: any, solPrice: string) {
    if (!priceChange) return null;

    return {
      sol: priceChange.value || "0",
      usd: new BigNumber(priceChange.value || "0")
        .multipliedBy(solPrice)
        .toString(),
      percentage: priceChange.percentage || "0",
    };
  }

  // Helper function to format AUM change
  private static formatAUMChange(aumChange: any, solPrice: string) {
    if (!aumChange) return null;

    return {
      sol: aumChange.value || "0",
      usd: new BigNumber(aumChange.value || "0")
        .multipliedBy(solPrice)
        .toString(),
      percentage: aumChange.percentage || "0",
    };
  }

  // Helper function to calculate fund progress
  private static calculateFundProgress(
    targetAmount: string,
    aumSOL: BigNumber,
    aumUSD: BigNumber,
    solPrice: string
  ) {
    const currentAmountSOL = aumSOL.toString();
    const targetAmountSOL = targetAmount;
    const currentAmountUSD = aumUSD.toString();
    const targetAmountUSD = new BigNumber(targetAmountSOL)
      .multipliedBy(solPrice)
      .toString();

    // Calculate progress percentage
    const progressPercentage = new BigNumber(targetAmountSOL).isGreaterThan(0)
      ? new BigNumber(currentAmountSOL)
          .dividedBy(new BigNumber(targetAmountSOL))
          .multipliedBy(100)
          .toFixed(2)
      : "0";

    return {
      current: {
        sol: currentAmountSOL,
        usd: currentAmountUSD,
      },
      target: {
        sol: targetAmountSOL,
        usd: targetAmountUSD,
      },
      percentage: progressPercentage,
    };
  }

  // Helper function to apply post-processing sort
  private static applyPostProcessingSort(
    funds: any[],
    postSortField: string,
    postSortDirection: string
  ) {
    return funds.sort((a, b) => {
      const aValue = parseFloat(
        postSortField.split(".").reduce((obj, key) => obj?.[key], a) || "0"
      );
      const bValue = parseFloat(
        postSortField.split(".").reduce((obj, key) => obj?.[key], b) || "0"
      );

      return postSortDirection === "desc" ? bValue - aValue : aValue - bValue;
    });
  }

  static getAllFunds = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page, limit } = req.query;
      const { funds, fundsCount } = await fundServices.getAllFunds(
        Number(page),
        Number(limit)
      );
      res.status(200).json({
        success: true,
        funds,
        fundsCount,
      });
    }
  );

  static triggerFundStatusUpdate = async (req: Request, res: Response) => {
    try {
      await FundCleanupService.checkAndUpdateFundStatuses();
      res.status(200).json({
        success: true,
        message: "Fund statuses updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to update fund statuses",
      });
    }
  };

  static getFundByName = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!name) {
        return next(errorHandler(400, "Fund name is required"));
      }

      // Create a query filter for name search
      const queryFilter = {
        fundName: { $regex: name, $options: "i" },
        isActive: true,
      };

      // Use the same aggregation pipeline as getFunds
      const { funds, fundsCount } = await fundServices.getEnhancedFunds(
        queryFilter,
        { createdAt: -1 }, // Default sort by newest
        Number(page),
        Number(limit)
      );

      // Reuse the helper functions from getFunds
      const { tokenPrices, solPrice } = await this.getTokenPrices(funds);
      const enhancedFunds = await this.enhanceFundsWithMarketValues(
        funds,
        tokenPrices,
        solPrice
      );

      res.status(200).json({
        success: true,
        funds: enhancedFunds,
        count: fundsCount,
        page: Number(page),
        limit: Number(limit),
      });
    }
  );

  /**
   * Get fund details by address
   */
  static getFundByAddress = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { address } = req.params;

      if (!address) {
        return next(errorHandler(400, "Fund address is required"));
      }

      // Use aggregation pipeline for a single fund
      const queryFilter = { fundContractAddress: address, isActive: true };

      const { funds, fundsCount } = await fundServices.getEnhancedFunds(
        queryFilter,
        { createdAt: -1 },
        1,
        1
      );

      if (!funds || funds.length === 0) {
        return next(errorHandler(404, "Fund not found"));
      }

      const fund = funds[0];

      // Get token prices for assets
      const { tokenPrices, solPrice } = await this.getTokenPrices([fund]);

      // Enhance fund with market values and metrics
      const enhancedFund = (
        await this.enhanceFundsWithMarketValues([fund], tokenPrices, solPrice)
      )[0];

      res.status(200).json({
        success: true,
        fund: enhancedFund,
      });
    }
  );

  /**
   * Get the fund with the highest performance gain
   */
  static getMostGainingFund = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Use aggregation pipeline with performance sorting
        const queryFilter = {
          fundStatus: "trading",
          isActive: true,
        };

        const { funds } = await fundServices.getEnhancedFunds(
          queryFilter,
          { "priceChange.percentage": -1 }, // Sort by price change percentage descending
          1, // Get only the top fund
          1
        );

        if (!funds || funds.length === 0) {
          return next(errorHandler(404, "No trading funds found"));
        }

        const fund = funds[0];

        // Get token prices for assets
        const { tokenPrices, solPrice } = await this.getTokenPrices([fund]);

        // Enhance fund with market values and metrics
        const enhancedFund = (
          await this.enhanceFundsWithMarketValues([fund], tokenPrices, solPrice)
        )[0];

        res.status(200).json({
          success: true,
          fund: enhancedFund,
        });
      } catch (error) {
        return next(
          errorHandler(500, `Error getting most gaining fund: ${error.message}`)
        );
      }
    }
  );

  /**
   * Get fund leaderboard sorted by price or AUM
   */
  static getFundLeaderboard = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page = 1, limit = 10, sortBy = "price" } = req.query;

      // Use aggregation pipeline with appropriate sorting
      const queryFilter = {
        fundStatus: "trading",
        isActive: true,
      };

      // Determine sort criteria based on sortBy parameter
      let sortCriteria = {};
      let postSortField = "";
      let needsPostSort = true;

      if (sortBy === "price") {
        postSortField = "performance.tokenPrice.sol";
      } else if (sortBy === "aum") {
        postSortField = "performance.aum.sol";
      }

      // Get funds using our enhanced method
      const { funds, fundsCount } = await fundServices.getEnhancedFunds(
        queryFilter,
        { createdAt: -1 }, // Default sort, will be overridden by post-processing
        Number(page),
        Number(limit)
      );

      // Get token prices and enhance funds
      const { tokenPrices, solPrice } = await this.getTokenPrices(funds);
      let enhancedFunds = await this.enhanceFundsWithMarketValues(
        funds,
        tokenPrices,
        solPrice
      );

      // Apply post-processing sort
      if (needsPostSort && postSortField) {
        enhancedFunds = this.applyPostProcessingSort(
          enhancedFunds,
          postSortField,
          "desc" // Always descending for leaderboard
        );
      }

      // Add position information and get previous positions
      const fundsWithPositions = await Promise.all(
        enhancedFunds.map(async (fund, index) => {
          const currentPosition =
            (Number(page) - 1) * Number(limit) + index + 1;

          // Get previous position data from ranking history
          const positionChange = await FundRankingService.getFundPositionChange(
            fund._id.toString(),
            sortBy as "price" | "aum"
          );

          return {
            position: currentPosition,
            previousPosition: positionChange?.previousPosition || null,
            change: positionChange?.change || 0,
            fund: fund,
          };
        })
      );

      // Save today's rankings if we're on the first page
      if (Number(page) === 1) {
        try {
          // Only save rankings for funds on the first page
          const rankingsToSave = fundsWithPositions.map((item) => ({
            fundId: item.fund._id.toString(),
            position: item.position,
          }));

          // Check if we already have a snapshot for today
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existingSnapshot = await FundRankingHistory.findOne({
            rankingType: sortBy as string,
            snapshotDate: {
              $gte: today,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          });

          if (!existingSnapshot) {
            await FundRankingService.saveRankingSnapshot(
              sortBy as "price" | "aum",
              rankingsToSave
            );
          } else {
          }
        } catch (error) {
          console.error("Error saving ranking snapshot:", error);
          // Continue without failing the request
        }
      }

      res.status(200).json({
        success: true,
        funds: fundsWithPositions,
        count: fundsCount,
        page: Number(page),
        limit: Number(limit),
      });
    }
  );

  /**
   * Get a quote for selling fund tokens
   */
  static getSellQuote = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { fundAddress, amount } = req.body;

      if (!validateBigNumberString(amount)) {
        return next(errorHandler(400, "Invalid amount format"));
      }

      // Get fund and user
      const fund = await fundServices.getFundByAddress(fundAddress);
      if (!fund) {
        return next(errorHandler(400, "Fund with given address not found."));
      }

      // Check if fund is in trading status
      if (fund.fundStatus === "fundraising") {
        return next(
          errorHandler(400, "Cannot sell tokens during fundraising period.")
        );
      }

      // Calculate what percentage of the fund the user is selling
      const percentageSold = new BigNumber(amount)
        .dividedBy(fund.fundTokens)
        .multipliedBy(100)
        .toString();

      // Get fund token price
      const fundTokenPrice =
        await AssetValuationService.calculateFundTokenPrice(
          fund.assets,
          fund.fundTokens
        );

      // Get SOL price
      const solPrice = await tokenRegistryService.getTokenPrice(
        envConfigs.solTokenAddress
      );
      const carryFeePercentage = fund.annualManagementFee;

      // Calculate asset deductions and fees
      const assetDeductions = [];
      let totalSolToSend = new BigNumber(0);

      for (const asset of fund.assets) {
        // Calculate amount to decrease for this asset
        const assetAmountToDecrease = new BigNumber(asset.amount)
          .multipliedBy(percentageSold)
          .dividedBy(100)
          .toString();

        const newAmount = subtractBigNumbers(
          asset.amount,
          assetAmountToDecrease
        );

        assetDeductions.push({
          tokenAddress: asset.tokenAddress,
          tokenSymbol: asset.tokenSymbol,
          currentAmount: asset.amount,
          amountToDecrease: assetAmountToDecrease,
          newAmount,
          carryFee: new BigNumber(carryFeePercentage)
            .dividedBy(100)
            .multipliedBy(newAmount)
            .toString(),
        });
      }

      res.status(200).json({
        success: true,
        quote: {
          fundAddress,
          fundName: fund.fundName,
          fundTokensToSell: amount,
          percentageOfFund: percentageSold,
          fundTokenPrice,
          totalSolToReceive: totalSolToSend.toString(),
          totalValueUSD: new BigNumber(totalSolToSend)
            .multipliedBy(solPrice)
            .toString(),
          assetDeductions,
        },
      });
    }
  );
}

export default fundController;
