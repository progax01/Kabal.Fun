import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import FundAssetHistory from "../models/fundAssetHistoryModel";
import Ledger from "../models/ledgerModel";
import Trade from "../models/tradeModel";
import TokenPriceHistory from "../models/tokenPriceHistoryModel";
import { BigNumber } from "bignumber.js";
import AssetValuationService from "../services/price/assetValuationService";
import { Types } from "mongoose";
import fundServices from "../services/db/fundServices";

class FundAnalyticsController {
  /**
   * Get fund performance data for graphing (price and AUM)
   */
  static getFundPerformanceData = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { timeframe = '1m', dataPoints = 30 } = req.query;
      const fund = await fundServices.getFundByAddress(req.params.fundAddress);
      
      if (!fund) {
        return next(errorHandler(404, "Fund not found"));
      }
      
      // Calculate start date based on timeframe
      const endDate = new Date();
      let startDate = new Date();
      
      switch(timeframe) {
        case '1d': startDate.setDate(endDate.getDate() - 1); break;
        case '1w': startDate.setDate(endDate.getDate() - 7); break;
        case '1m': startDate.setMonth(endDate.getMonth() - 1); break;
        case '3m': startDate.setMonth(endDate.getMonth() - 3); break;
        case '6m': startDate.setMonth(endDate.getMonth() - 6); break;
        case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        case 'all': startDate = new Date(fund.createdAt); break;
        default: startDate.setMonth(endDate.getMonth() - 1);
      }
      
      // First, determine the earliest activity date
      let earliestActivityDate = fund.createdAt;
      
      // Get all asset history, ledgers and trades within the timeframe
      const assetHistory = await FundAssetHistory.find({
        fundId: fund._id,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });
      
      const ledgers = await Ledger.find({
        fundId: fund._id,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });
      
      const trades = await Trade.find({
        fundId: fund._id,
        executedAt: { $gte: startDate, $lte: endDate }
      }).sort({ executedAt: 1 });
      
      // Find the earliest event across all data sources
      if (assetHistory.length > 0) {
        earliestActivityDate = new Date(Math.min(
          earliestActivityDate.getTime(),
          assetHistory[0].timestamp.getTime()
        ));
      }
      
      if (ledgers.length > 0) {
        earliestActivityDate = new Date(Math.min(
          earliestActivityDate.getTime(),
          ledgers[0].timestamp.getTime()
        ));
      }
      
      if (trades.length > 0) {
        earliestActivityDate = new Date(Math.min(
          earliestActivityDate.getTime(),
          trades[0].executedAt.getTime()
        ));
      }
      
      // Adjust startDate if needed to not go before earliest activity
      startDate = new Date(Math.max(startDate.getTime(), earliestActivityDate.getTime()));
      
      // Create intervals based on the timeframe
      const intervals = [];
      let intervalStep = 1; // Default step size
      let intervalUnit = 'day'; // Default unit
      
      // Determine appropriate interval unit and step based on timeframe
      switch(timeframe) {
        case '1d':
          intervalUnit = 'hour';
          intervalStep = 1; // Hourly intervals for 1-day view
          break;
        case '1w':
          intervalUnit = 'day';
          intervalStep = 1; // Daily intervals for 1-week view
          break;
        case '1m':
          intervalUnit = 'day';
          intervalStep = 1; // Daily intervals for 1-month view
          break;
        case '3m':
          intervalUnit = 'day';
          intervalStep = 3; // Every 3 days for 3-month view
          break;
        case '6m':
          intervalUnit = 'week';
          intervalStep = 1; // Weekly intervals for 6-month view
          break;
        case '1y':
          intervalUnit = 'week';
          intervalStep = 2; // Bi-weekly intervals for 1-year view
          break;
        case 'all':
          intervalUnit = 'month';
          intervalStep = 1; // Monthly intervals for all-time view
          break;
      }
      
      // Generate intervals based on unit and step
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        intervals.push(new Date(currentDate));
        
        // Advance to next interval
        switch(intervalUnit) {
          case 'hour':
            currentDate = new Date(currentDate.setHours(currentDate.getHours() + intervalStep));
            break;
          case 'day':
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + intervalStep));
            break;
          case 'week':
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + (7 * intervalStep)));
            break;
          case 'month':
            currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + intervalStep));
            break;
        }
      }
      
      // Ensure we have the end date in our intervals
      if (intervals.length > 0 && intervals[intervals.length - 1] < endDate) {
        intervals.push(endDate);
      }
      
      // If we have too many intervals, reduce them to match dataPoints
      if (intervals.length > Number(dataPoints)) {
        const step = Math.ceil(intervals.length / Number(dataPoints));
        const reducedIntervals = [];
        
        for (let i = 0; i < intervals.length; i += step) {
          reducedIntervals.push(intervals[i]);
        }
        
        // Always include the last interval
        if (reducedIntervals[reducedIntervals.length - 1] !== intervals[intervals.length - 1]) {
          reducedIntervals.push(intervals[intervals.length - 1]);
        }
        
        intervals.length = 0;
        intervals.push(...reducedIntervals);
      }
      
      // If we have too few intervals, interpolate additional points
      if (intervals.length < Number(dataPoints) && intervals.length > 1) {
        const originalIntervals = [...intervals];
        intervals.length = 0;
        
        const timeRange = originalIntervals[originalIntervals.length - 1].getTime() - originalIntervals[0].getTime();
        const pointInterval = timeRange / (Number(dataPoints) - 1);
        
        for (let i = 0; i < Number(dataPoints); i++) {
          intervals.push(new Date(originalIntervals[0].getTime() + (pointInterval * i)));
        }
      }
      
      // Get all unique token addresses from fund assets
      const tokenAddresses = [...new Set(
        fund.assets.map((asset: any) => {
          // Try to access tokenAddress safely regardless of object structure
          const address = typeof asset.tokenAddress === 'string' 
            ? asset.tokenAddress 
            : (asset._doc && asset._doc.tokenAddress);
          
          return address || null;
        }).filter(Boolean) // Remove any null values
      )];
      
      // Get token price histories for all tokens in the fund
      const tokenPriceHistories = await TokenPriceHistory.find({
        tokenAddress: { $in: tokenAddresses },
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ tokenAddress: 1, timestamp: 1 });
      
      // Group token price histories by token address
      const tokenPricesByAddress = tokenPriceHistories.reduce((acc, entry) => {
        const address = entry.tokenAddress;
        if (!acc[address]) {
          acc[address] = [];
        }
        acc[address].push({
          timestamp: entry.timestamp,
          price: entry.price
        });
        return acc;
      }, {});
      
      // Combine all events chronologically
      const allEvents = [
        ...assetHistory.map(event => ({ 
          type: 'asset', 
          timestamp: event.timestamp,
          data: event 
        })),
        ...ledgers.map(event => ({ 
          type: 'ledger', 
          timestamp: event.timestamp,
          data: event 
        })),
        ...trades.map(event => ({ 
          type: 'trade', 
          timestamp: event.executedAt,
          data: event 
        }))
      ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Calculate fund state at each interval
      const performanceData = [];
      
      for (const intervalDate of intervals) {
        // For intervals before any fund activity, use zero values
        if (intervalDate < earliestActivityDate) {
          performanceData.push({
            date: intervalDate,
            tokenPrice: "0",
            aum: "0"
          });
          continue;
        }
        
        // Get all events up to this interval
        const eventsUpToInterval = allEvents.filter(
          event => event.timestamp <= intervalDate
        );
        
        // Reconstruct fund state at this interval
        const fundState = await this.reconstructFundState(fund, eventsUpToInterval);
        
        // Calculate AUM using token prices from our history
        let aum = new BigNumber(0);
        
        for (const asset of fundState.assets) {
          const tokenAddress = asset.tokenAddress;
          const amount = new BigNumber(asset.amount);
          
          // Get the closest price to the interval date
          const price = this.getClosestTokenPrice(tokenPricesByAddress[tokenAddress], intervalDate);
          
          if (price) {
            aum = aum.plus(amount.multipliedBy(price));
          }
        }
        
        // Calculate token price (AUM / fund tokens)
        const tokenPrice = fundState.fundTokens && new BigNumber(fundState.fundTokens).gt(0)
          ? aum.dividedBy(new BigNumber(fundState.fundTokens)).toString()
          : "0";
        
        performanceData.push({
          date: intervalDate,
          tokenPrice,
          aum: aum.toString()
        });
      }
      
      res.status(200).json({
        success: true,
        fund: {
          id: fund._id,
          name: fund.fundName,
          ticker: fund.fundTicker
        },
        performanceData,
        timeframe
      });
    }
  );
  
  /**
   * Get the closest token price to a given date
   * @private
   */
  private static getClosestTokenPrice(priceHistory, targetDate) {
    if (!priceHistory || priceHistory.length === 0) {
      return null;
    }
    
    // If only one price point, use it
    if (priceHistory.length === 1) {
      return priceHistory[0].price;
    }
    
    const targetTime = targetDate.getTime();
    
    // Find the closest price point by timestamp
    let closestPrice = priceHistory[0];
    let closestDiff = Math.abs(priceHistory[0].timestamp.getTime() - targetTime);
    
    for (let i = 1; i < priceHistory.length; i++) {
      const currentDiff = Math.abs(priceHistory[i].timestamp.getTime() - targetTime);
      if (currentDiff < closestDiff) {
        closestDiff = currentDiff;
        closestPrice = priceHistory[i];
      }
    }
    
    return closestPrice.price;
  }
  
  /**
   * Reconstruct fund state at a specific point in time
   * @private
   */
  private static async reconstructFundState(fund, events) {
    // Start with initial state
    const fundState = {
      // Extract just the data we need from each asset
      assets: fund.assets.map(asset => ({
        tokenAddress: asset.tokenAddress,
        tokenSymbol: asset.tokenSymbol,
        amount: asset.amount
      })),
      fundTokens: fund.fundTokens
    };
    
    // Apply all events chronologically to reconstruct state
    for (const event of events) {
      switch (event.type) {
        case 'asset':
          // Asset history already contains the state after the change
          const assetEvent = event.data;
          if (!assetEvent || !assetEvent.tokenAddress) {
            console.log("Skipping invalid asset event:", assetEvent);
            continue; // Skip invalid asset events
          }
          
          const assetIndex = fundState.assets.findIndex(
            asset => asset && asset.tokenAddress && 
            asset.tokenAddress === assetEvent.tokenAddress
          );
          
          if (assetIndex >= 0) {
            fundState.assets[assetIndex].amount = assetEvent.amountAfter;
          } else {
            fundState.assets.push({
              tokenAddress: assetEvent.tokenAddress,
              tokenSymbol: assetEvent.tokenSymbol,
              amount: assetEvent.amountAfter
            });
          }
          break;
          
        case 'ledger':
          // Ledgers affect fund tokens
          const ledgerEvent = event.data;
          if (ledgerEvent.method === 'buy') {
            // Tokens were added
            fundState.fundTokens = new BigNumber(fundState.fundTokens)
              .plus(ledgerEvent.fundTokensAmount || '0')
              .toString();
          } else if (ledgerEvent.method === 'sell') {
            // Tokens were removed
            fundState.fundTokens = new BigNumber(fundState.fundTokens)
              .minus(ledgerEvent.fundTokensAmount || '0')
              .toString();
          }
          break;
          
        case 'trade':
          // Trades don't affect fund tokens, only assets
          // Asset changes are already captured in asset history
          break;
      }
    }
    
    return fundState;
  }
}

export default FundAnalyticsController; 