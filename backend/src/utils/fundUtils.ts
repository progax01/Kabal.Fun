import BigNumber from "bignumber.js";
import userModel from "../models/userModel";
import AssetValuationService from "../services/price/assetValuationService";
import ledgerServices from "../services/db/ledgerServices";
import tokenRegistryService from "../services/db/tokenRegistryService";
import TokenPriceHistory from "../models/tokenPriceHistoryModel";
import FundPriceHistory from "../models/fundPriceHistoryModel";

/**
 * Get SOL price in USD for currency conversion
 */
export async function getSOLPrice(): Promise<string> {
  const solAddress = process.env.SOL_TOKEN_ADDRESS || 'So11111111111111111111111111111111111111112';
  const latestPrices = await AssetValuationService.getLatestTokenPrices([solAddress]);
  return latestPrices[solAddress] || "0";
}

/**
 * Get historical SOL price at a specific timestamp
 */
export async function getHistoricalSOLPrice(timestamp: Date): Promise<string> {
  const solAddress = process.env.SOL_TOKEN_ADDRESS || 'So11111111111111111111111111111111111111112';
  
  // Find the closest price entry before the given timestamp
  const priceEntry = await TokenPriceHistory.findOne({
    tokenAddress: solAddress,
    timestamp: { $lte: timestamp }
  }).sort({ timestamp: -1 });
  
  if (priceEntry) {
    return priceEntry.price;
  }
  
  // Fallback to current price if no historical data is available
  return await getSOLPrice();
}

/**
 * Get manager details for a fund
 */
export async function getManagerDetails(managerId: any) {
  if (!managerId) return null;
  
  const manager: any = await userModel.findById(managerId)
    .select('walletAddress socials')
    .lean();
  
  if (!manager) return null;
  
  // Filter out sensitive fields
  delete manager.authToken;
  delete manager.nonce;
  
  // Format manager socials
  if (manager.socials) {
    manager.socials = manager.socials.map((social: any) => ({
      social: social.social,
      followers: social.followers,
      image: social.image,
      username: social.username
    }));
  }
  
  return manager;
}

/**
 * Calculate performance metrics for a trading fund
 */
export async function calculatePerformanceMetrics(assets: any[], fundTokens: string, solPrice: string) {
  // Calculate token price in SOL
  const tokenPrice = await AssetValuationService.calculateFundTokenPrice(
    assets || [],
    fundTokens || "0"
  );
  
  // Get AUM in SOL
  const aumInSOL = await AssetValuationService.calculateTotalAssetValueInSOL(
    assets || []
  );
  
  // Calculate USD values
  const tokenPriceUSD = new BigNumber(tokenPrice)
    .multipliedBy(new BigNumber(solPrice))
    .toString();
  
  const aumInUSD = new BigNumber(aumInSOL)
    .multipliedBy(new BigNumber(solPrice))
    .toString();
  
  return {
    tokenPrice: {
      sol: tokenPrice,
      usd: tokenPriceUSD
    },
    aum: {
      sol: aumInSOL,
      usd: aumInUSD
    }
  };
}

/**
 * Calculate progress metrics for a fundraising fund
 */
export function calculateProgressMetrics(assets: any[], targetRaiseAmount: string, solPrice: string) {
  const solAddress = process.env.SOL_TOKEN_ADDRESS || 'So11111111111111111111111111111111111111112';
  const solAsset = assets?.find(asset => 
    asset.tokenAddress === solAddress
  );
  
  const currentAmount = solAsset ? solAsset.amount : "0";
  const targetAmount = targetRaiseAmount || "0";
  
  // Calculate progress percentage
  const progress = new BigNumber(targetAmount).isGreaterThan(0) 
    ? new BigNumber(currentAmount)
      .dividedBy(new BigNumber(targetAmount))
      .multipliedBy(100)
      .toFixed(2)
    : "0";
  
  // Calculate USD values
  const currentAmountUSD = new BigNumber(currentAmount)
    .multipliedBy(new BigNumber(solPrice))
    .toString();
  
  const targetAmountUSD = new BigNumber(targetAmount)
    .multipliedBy(new BigNumber(solPrice))
    .toString();
  
  return {
    current: {
      sol: currentAmount,
      usd: currentAmountUSD
    },
    target: {
      sol: targetAmount,
      usd: targetAmountUSD
    },
    percentage: progress
  };
}

/**
 * Get historical fund token prices and AUM
 * @param fundId The fund ID
 * @param period The time period to get history for ('24h', '7d', '30d', 'all')
 * @returns Historical price and AUM data
 */
export async function getFundPriceHistory(fundId: string, period: string = '30d') {
  // Define the start date based on the period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '24h':
      startDate.setDate(now.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case 'all':
      // Use a very old date to get all history
      startDate = new Date(2020, 0, 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30); // Default to 30 days
  }
  
  // Get historical price data from FundPriceHistory
  const priceHistoryData = await FundPriceHistory.find({
    fundId,
    timestamp: { $gte: startDate, $lte: now }
  }).sort({ timestamp: 1 });
  
  if (priceHistoryData.length === 0) {
    return {
      priceHistory: [],
      aumHistory: [],
      changes: {
        price: { sol: "0", usd: "0", percentage: "0" },
        aum: { sol: "0", usd: "0", percentage: "0" }
      }
    };
  }
  
  // Get SOL price for USD conversion
  const solPrice = await getSOLPrice();
  
  // Format the price history data
  const priceHistory = [];
  const aumHistory = [];
  
  for (const entry of priceHistoryData) {
    // Get historical SOL price at this timestamp
    const historicalSolPrice = await getHistoricalSOLPrice(entry.timestamp);
    
    // Calculate USD values
    const tokenPriceUSD = new BigNumber(entry.tokenPrice)
      .multipliedBy(new BigNumber(historicalSolPrice))
      .toString();
    
    const aumUSD = new BigNumber(entry.aum)
      .multipliedBy(new BigNumber(historicalSolPrice))
      .toString();
    
    priceHistory.push({
      timestamp: entry.timestamp,
      price: {
        sol: entry.tokenPrice,
        usd: tokenPriceUSD
      }
    });
    
    aumHistory.push({
      timestamp: entry.timestamp,
      aum: {
        sol: entry.aum,
        usd: aumUSD
      }
    });
  }
  
  // Calculate price and AUM changes
  const oldestPrice = priceHistory[0]?.price;
  const latestPrice = priceHistory[priceHistory.length - 1]?.price;
  
  const oldestAum = aumHistory[0]?.aum;
  const latestAum = aumHistory[aumHistory.length - 1]?.aum;
  
  // Calculate percentage changes
  const priceChangeSol = oldestPrice && latestPrice 
    ? new BigNumber(latestPrice.sol).minus(new BigNumber(oldestPrice.sol)).toString()
    : "0";
    
  const priceChangeUsd = oldestPrice && latestPrice 
    ? new BigNumber(latestPrice.usd).minus(new BigNumber(oldestPrice.usd)).toString()
    : "0";
    
  const priceChangePercentage = oldestPrice && latestPrice && !new BigNumber(oldestPrice.sol).isZero()
    ? new BigNumber(latestPrice.sol)
        .minus(new BigNumber(oldestPrice.sol))
        .dividedBy(new BigNumber(oldestPrice.sol))
        .multipliedBy(100)
        .toFixed(2)
    : "0";
  
  const aumChangeSol = oldestAum && latestAum 
    ? new BigNumber(latestAum.sol).minus(new BigNumber(oldestAum.sol)).toString()
    : "0";
    
  const aumChangeUsd = oldestAum && latestAum 
    ? new BigNumber(latestAum.usd).minus(new BigNumber(oldestAum.usd)).toString()
    : "0";
    
  const aumChangePercentage = oldestAum && latestAum && !new BigNumber(oldestAum.sol).isZero()
    ? new BigNumber(latestAum.sol)
        .minus(new BigNumber(oldestAum.sol))
        .dividedBy(new BigNumber(oldestAum.sol))
        .multipliedBy(100)
        .toFixed(2)
    : "0";
  
  return {
    priceHistory,
    aumHistory,
    changes: {
      price: {
        sol: priceChangeSol,
        usd: priceChangeUsd,
        percentage: priceChangePercentage
      },
      aum: {
        sol: aumChangeSol,
        usd: aumChangeUsd,
        percentage: aumChangePercentage
      }
    }
  };
}

/**
 * Get a fund by ID
 */
async function getFundById(fundId: string) {
  try {
    const fundModel = require('../models/fundModel').default;
    return await fundModel.findById(fundId);
  } catch (error) {
    console.error(`Error getting fund by ID: ${error}`);
    return null;
  }
}

/**
 * Enhance a fund with manager details, performance and progress metrics
 */
export async function enhanceFundWithDetails(fund: any) {
  // Convert to plain object if it's a Mongoose document
  const fundObj = typeof fund.toObject === 'function' ? fund.toObject() : { ...fund };
  
  // Get SOL price for USD conversion
  const solPrice = await getSOLPrice();
  
  // Add manager details
  if (fundObj.managerId) {
    const manager = await getManagerDetails(fundObj.managerId);
    if (manager) {
      fundObj.manager = manager;
    }
  }
  
  // Calculate performance metrics for all funds
  fundObj.performance = await calculatePerformanceMetrics(
    fundObj.assets || [],
    fundObj.fundTokens || "0",
    solPrice
  );
  
  // Get price history for the last 24 hours for all funds
  const priceHistory = await getFundPriceHistory(fundObj._id, '24h');
  
  // Add price change data for all funds
  fundObj.priceChange = priceHistory.changes.price;
  fundObj.aumChange = priceHistory.changes.aum;
  
  // Add progress metrics for all fund types
  fundObj.progress = calculateProgressMetrics(
    fundObj.assets || [], 
    fundObj.targetRaiseAmount || "0",
    solPrice
  );
  
  return fundObj;
} 