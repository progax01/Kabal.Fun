import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import fundServices from "../services/db/fundServices";
import userServices from "../services/db/userServices";
import ledgerServices from "../services/db/ledgerServices";
import userHoldingServices from "../services/db/userHoldingServices";
import errorHandler from "../helpers/errorHandler";
import AssetValuationService from "../services/price/assetValuationService";
import { Types } from "mongoose";
import tokenRegistryService from "../services/db/tokenRegistryService";
import jupiterService from "../services/blockchain/jupiterService";
import BigNumber from "bignumber.js";
import { enhanceFundWithDetails } from "../utils/fundUtils";
import marketCapService from "../services/price/marketCapService";

class ManagerController {
  // Get all funds managed by the authenticated user
  static getManagerFunds = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      // Check if user is authenticated
      if (!req.user) {
        return next(errorHandler(401, "Authentication required"));
      }
      
      const funds = await fundServices.getFundsByManager(req.user._id.toString());
      
      res.status(200).json({
        success: true,
        funds
      });
    }
  );
  
  // Get detailed fund information for a manager
  static getFundDetails = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      // req.user and req.fund are set by the isManager middleware
      const fund = req.fund;
      
      // Enhance fund with all details
      const enhancedFund = await enhanceFundWithDetails(fund);
      
      // Enhance fund assets with detailed market data
      if (enhancedFund.assets && enhancedFund.assets.length > 0) {
        const enhancedAssets = await Promise.all(
          enhancedFund.assets.map(async (asset) => {
            try {
              // Get token details from registry first
              const tokenDetails = await tokenRegistryService.getTokenByAddress(asset.tokenAddress);
              
              // Then declare priceInUSD using tokenDetails
              let priceInUSD = tokenDetails?.lastPrice || "0";
              
              // Get token price history for different time periods
              const now = new Date();
              const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
              
              const [oneDayHistory, sevenDayHistory, oneHourHistory] = await Promise.all([
                tokenRegistryService.getTokenPriceChange(asset.tokenAddress, oneDayAgo, now),
                tokenRegistryService.getTokenPriceChange(asset.tokenAddress, sevenDaysAgo, now),
                tokenRegistryService.getTokenPriceChange(asset.tokenAddress, oneHourAgo, now)
              ]);
              
              // Get additional market data from CoinMarketCap
              let marketData = null;
              try {
                // Try to get market data from CoinMarketCap API
                const cmcData = await marketCapService.getTokenMarketData(asset.tokenSymbol);
                
                if (cmcData) {
                  // Create market data object without N/A values
                  marketData = {
                    price: cmcData.price || "0",
                    volume24h: cmcData.volume24h || "0",
                    fdv: cmcData.fdv || "0",
                    marketCap: cmcData.marketCap || "0",
                    priceChange: {
                      "1h": cmcData.percentChange1h || "0",
                      "24h": cmcData.percentChange24h || "0",
                      "7d": cmcData.percentChange7d || "0"
                    }
                  };
                  
                  // Use CMC price data if available
                  if (cmcData.price) {
                    priceInUSD = cmcData.price;
                  }
                }
              } catch (error) {
                console.error(`Error getting market data for ${asset.tokenSymbol}:`, error);
              }
              
              // Return enhanced asset data
              return {
                ...asset,
                name: tokenDetails?.name || asset.tokenSymbol,
                logo: tokenDetails?.logoURI || null,
                price: {
                  usd: priceInUSD,
                  change: {
                    "1h": oneHourHistory?.changePercent || "0",
                    "24h": oneDayHistory?.changePercent || "0",
                    "7d": sevenDayHistory?.changePercent || "0"
                  }
                },
                market: marketData || {
                  volume24h: "0",
                  fdv: "0"
                }
              };
            } catch (error) {
              console.error(`Error enhancing asset ${asset.tokenAddress}:`, error);
              return asset;
            }
          })
        );
        
        enhancedFund.assets = enhancedAssets;
      }
      
      res.status(200).json({
        success: true,
        fund: enhancedFund
      });
    }
  );

  /**
   * Get fund portfolio with key metrics and asset details
   */
  static getFundPortfolio = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      // req.user and req.fund are set by the isManager middleware
      const fund = req.fund;
      
      // Enhance fund with basic details
      const enhancedFund = await enhanceFundWithDetails(fund);
      
      // Calculate key metrics
      const aumUSD = enhancedFund.performance?.aum?.usd || "0";
      
      // Calculate management fee earned (annual fee prorated by time since fund creation)
      const creationDate = new Date(fund.createdAt);
      const now = new Date();
      const fundAgeInDays = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
      const annualFeePercentage = fund.annualManagementFee || 2; // Default to 2% if not set
      const managementFeeUSD = new BigNumber(aumUSD)
        .multipliedBy(annualFeePercentage / 100)
        .multipliedBy(fundAgeInDays / 365)
        .toString();
      
      // Get trading fees from ledger
      const tradingFeesUSD = await ledgerServices.getTotalTradingFees(fund._id.toString());
      
      // Calculate fund PNL
      const initialAUM = await fundServices.getInitialAUM(fund._id.toString());
      const currentAUM = new BigNumber(aumUSD);
      const pnlUSD = currentAUM.minus(initialAUM).toString();
      const pnlPercentage = initialAUM.isGreaterThan(0) 
        ? currentAUM.minus(initialAUM).dividedBy(initialAUM).multipliedBy(100).toString()
        : "0";
      
      // Enhance fund assets with detailed information
      const enhancedAssets = await Promise.all(
        (enhancedFund.assets || []).map(async (asset) => {
          try {
            // Get token details from registry
            const tokenDetails = await tokenRegistryService.getTokenByAddress(asset.tokenAddress);
            
            // Get token price and price history
            let priceInUSD = tokenDetails?.lastPrice || "0";
            
            // Get price history for different time periods
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            const [oneDayHistory, sevenDayHistory, oneHourHistory] = await Promise.all([
              tokenRegistryService.getTokenPriceChange(asset.tokenAddress, oneDayAgo, now),
              tokenRegistryService.getTokenPriceChange(asset.tokenAddress, sevenDaysAgo, now),
              tokenRegistryService.getTokenPriceChange(asset.tokenAddress, oneHourAgo, now)
            ]);
            
            // Try to get market data from CoinMarketCap
            try {
              const cmcData = await marketCapService.getTokenMarketData(asset.tokenSymbol);
              if (cmcData && cmcData.price) {
                priceInUSD = cmcData.price;
              }
            } catch (error) {
              console.error(`Error getting market data for ${asset.tokenSymbol}:`, error);
            }
            
            // Calculate holdings value in USD
            const holdingsUSD = new BigNumber(asset.quantity || "0")
              .multipliedBy(priceInUSD)
              .toString();
            
            // Calculate fund share percentage
            const sharePercentage = new BigNumber(aumUSD).isGreaterThan(0)
              ? new BigNumber(holdingsUSD).dividedBy(aumUSD).multipliedBy(100).toFixed(2)
              : "0";
            
            // Get average entry price
            const entryPrice = await fundServices.getAssetAverageEntryPrice(
              fund._id.toString(), 
              asset.tokenAddress
            );
            
            // Calculate profit/loss
            const profitLossUSD = new BigNumber(priceInUSD)
              .minus(entryPrice)
              .multipliedBy(asset.quantity || "0")
              .toString();
            
            const profitLossPercentage = new BigNumber(entryPrice).isGreaterThan(0)
              ? new BigNumber(priceInUSD)
                  .minus(entryPrice)
                  .dividedBy(entryPrice)
                  .multipliedBy(100)
                  .toFixed(2)
              : "0";
            
            return {
              symbol: asset.tokenSymbol,
              name: tokenDetails?.name || asset.tokenSymbol,
              logo: tokenDetails?.logoURI || null,
              price: {
                usd: priceInUSD,
                change: {
                  "1h": oneHourHistory?.changePercent || "0",
                  "24h": oneDayHistory?.changePercent || "0",
                  "7d": sevenDayHistory?.changePercent || "0"
                }
              },
              holdings: {
                token: asset.quantity || "0",
                usd: holdingsUSD
              },
              averageEntry: entryPrice,
              sharePercentage,
              profitLoss: {
                usd: profitLossUSD,
                percentage: profitLossPercentage
              }
            };
          } catch (error) {
            console.error(`Error enhancing asset ${asset.tokenAddress}:`, error);
            return {
              symbol: asset.tokenSymbol,
              name: asset.tokenSymbol,
              holdings: {
                token: asset.quantity || "0",
                usd: "0"
              },
              sharePercentage: "0",
              profitLoss: {
                usd: "0",
                percentage: "0"
              }
            };
          }
        })
      );

      // Sort assets by value (highest to lowest)
      const sortedAssets = enhancedAssets.sort((a, b) => {
        return new BigNumber(b.holdings.usd).minus(a.holdings.usd).toNumber();
      });

      // Update the response to include the sorted assets
      res.status(200).json({
        success: true,
        fund: {
          name: fund.fundName,
          ticker: fund.fundTicker,
          logo: fund.fundLogoUrl,
          address: fund.fundContractAddress
        },
        keyMetrics: {
          aum: aumUSD,
          managementFee: managementFeeUSD,
          tradingFee: tradingFeesUSD,
          pnl: {
            usd: pnlUSD,
            percentage: pnlPercentage
          }
        },
        assets: sortedAssets
      });
    }
  );
}

export default ManagerController;