import { Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import marketCapService from "../services/price/marketCapService";
import { BigNumber } from "bignumber.js";
import { validateBigNumberString } from "../utils/bigNumberUtils";
import AssetValuationService from "../services/price/assetValuationService";
import tradeServices from "../services/db/tradeServices";
import { ICreateTradeData } from "../helpers/types/tradeTypes";
import jupiterService from "../services/blockchain/jupiterService";
import tokenRegistryService from '../services/db/tokenRegistryService';
import tokenDecimalsService from '../services/price/tokenDecimalsService';
import FundPriceHistoryService from "../services/db/fundPriceHistoryService";

class TradeController {
  /**
   * Execute a trade within a fund's assets using Jupiter DEX
   * Requires the manager to be authenticated and authorized for the fund
   */
  static executeTrade = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { 
        fromTokenAddress, 
        toTokenAddress, 
        fromTokenSymbol,
        toTokenSymbol,
        fromAmount,
        slippageBps = 100 // Default 1% slippage (100 basis points)
      } = req.body;
      
      // Validate required fields
      if (!fromTokenAddress || !toTokenAddress || !fromTokenSymbol || !toTokenSymbol || !fromAmount) {
        return next(errorHandler(400, "Missing required trade parameters"));
      }
      
      // Validate amount format
      if (!validateBigNumberString(fromAmount)) {
        return next(errorHandler(400, "Invalid amount format"));
      }
      
      // Get the fund from the middleware
      const fund = req.fund;
      
      // Check if fund is in trading status
      if (fund.fundStatus !== 'trading') {
        return next(errorHandler(400, "Fund must be in trading status to execute trades"));
      }
      
      // Find the source token in fund assets
      const fromAsset = fund.assets.find(
        asset => asset.tokenAddress === fromTokenAddress
      );
      
      if (!fromAsset) {
        return next(errorHandler(400, `Fund does not hold ${fromTokenSymbol}`));
      }
      
      // Check if fund has enough of the source token
      if (new BigNumber(fromAsset.amount).isLessThan(fromAmount)) {
        return next(errorHandler(400, `Insufficient ${fromTokenSymbol} balance. Available: ${fromAsset.amount}`));
      }
      
      try {
        // Get token decimals
        const fromTokenDecimals = await tokenDecimalsService.getTokenDecimals(fromTokenAddress);
        const toTokenDecimals = await tokenDecimalsService.getTokenDecimals(toTokenAddress);
        
        // Register source token
        await tokenRegistryService.registerToken(
          fromTokenAddress,
          fromTokenSymbol,
          fromTokenDecimals
        );
        
        // Register destination token
        await tokenRegistryService.registerToken(
          toTokenAddress,
          toTokenSymbol,
          toTokenDecimals
        );
        
        console.log(`Registered tokens: ${fromTokenSymbol}, ${toTokenSymbol}`);
        
        // Get current fund token price before trade
        const fundTokenPriceBefore = await AssetValuationService.calculateFundTokenPrice(
          fund.assets,
          fund.fundTokens
        );
        
        // Get quote from Jupiter DEX
        const quoteResponse = await jupiterService.getQuote({
          inputMint: fromTokenAddress,
          outputMint: toTokenAddress,
          amount: fromAmount,
          slippageBps
        });
        
        if (!quoteResponse || !quoteResponse.formattedOutAmount) {
          return next(errorHandler(400, "Could not get quote from Jupiter DEX"));
        }
        
        // Get token prices for record-keeping
        const fromTokenPrice = await marketCapService.getTokenPrice(fromTokenSymbol);
        const toTokenPrice = await marketCapService.getTokenPrice(toTokenSymbol);
        
        // Use the formatted output amount from Jupiter quote
        const toAmount = quoteResponse.formattedOutAmount;
        
        // Create a trade record
        const tradeData: ICreateTradeData = {
          fundId: fund._id,
          managerId: req.user._id,
          fromTokenAddress,
          fromTokenSymbol,
          fromAmount,
          fromTokenPrice: fromTokenPrice || "0",
          toTokenAddress,
          toTokenSymbol,
          toAmount,
          toTokenPrice: toTokenPrice || "0",
          slippage: slippageBps / 100, // Convert basis points to percentage
          fundTokenPriceBefore,
          fundTokenPriceAfter: fundTokenPriceBefore,
          notes: req.body.notes || "",
          routeInfo: JSON.stringify(quoteResponse.routeInfo || {})
        };
        
        const trade = await tradeServices.createTrade(tradeData);
        
        // Update fund assets - remove source token
        await fund.updateAsset(
          fromTokenAddress,
          fromTokenSymbol,
          fromAmount,
          'subtract',
          'trade_out',
          trade._id,
          'Trade'
        );
        
        // Update fund assets - add destination token
        await fund.updateAsset(
          toTokenAddress,
          toTokenSymbol,
          toAmount,
          'add',
          'trade_in',
          trade._id,
          'Trade'
        );
        
        // Recalculate fund token price after trade
        const fundTokenPriceAfter = await AssetValuationService.calculateFundTokenPrice(
          fund.assets,
          fund.fundTokens
        );
        
        await FundPriceHistoryService.recordFundPrice(fund._id, fund.assets, fund.fundTokens);
        
        res.status(200).json({
          success: true,
          message: `Successfully traded ${fromAmount} ${fromTokenSymbol} for ${toAmount} ${toTokenSymbol}`,
          trade: {
            id: trade._id,
            fromToken: fromTokenSymbol,
            toToken: toTokenSymbol,
            fromAmount,
            toAmount,
            fromTokenPrice,
            toTokenPrice,
            executedAt: trade.executedAt,
            fundTokenPriceBefore,
            fundTokenPriceAfter,
            route: quoteResponse.routeInfo
          },
          updatedAssets: fund.assets
        });
      } catch (error: any) {
        return next(errorHandler(500, `Trade execution failed: ${error.message}`));
      }
    }
  );
  
  /**
   * Get trade history for a fund
   * This would require a trade model to be implemented
   */
  static getTradeHistory = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { page = 1, limit = 10 } = req.query;
      const fund = req.fund;
      
      try {
        const { trades, tradesCount } = await tradeServices.getTradesByFund(
          fund._id.toString(),
          Number(page),
          Number(limit)
        );
        
        // Get trade statistics
        const tradeStats = await tradeServices.getTradeStats(fund._id.toString());
        
        res.status(200).json({
          success: true,
          trades,
          tradesCount,
          stats: tradeStats
        });
      } catch (error: any) {
        return next(errorHandler(500, `Failed to fetch trade history: ${error.message}`));
      }
    }
  );
  
  /**
   * Get current market prices for common tokens
   * Useful for managers to see trading opportunities
   */
  static getMarketPrices = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      try {
        // Get prices for common tokens
        const commonTokens = ['SOL', 'BTC', 'ETH', 'USDC', 'USDT'];
        const prices: Record<string, string> = {};
        
        for (const token of commonTokens) {
          const price = await marketCapService.getTokenPrice(token);
          if (price) {
            prices[token] = price;
          }
        }
        
        res.status(200).json({
          success: true,
          prices,
          timestamp: new Date()
        });
      } catch (error: any) {
        return next(errorHandler(500, `Failed to fetch market prices: ${error.message}`));
      }
    }
  );

  // Add a new method to get all trades by a manager across all funds
  static getManagerTrades = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { page = 1, limit = 10 } = req.query;
      
      try {
        const { trades, tradesCount } = await tradeServices.getTradesByManager(
          req.user._id.toString(),
          Number(page),
          Number(limit)
        );
        
        res.status(200).json({
          success: true,
          trades,
          tradesCount
        });
      } catch (error: any) {
        return next(errorHandler(500, `Failed to fetch manager trades: ${error.message}`));
      }
    }
  );
}

export default TradeController; 