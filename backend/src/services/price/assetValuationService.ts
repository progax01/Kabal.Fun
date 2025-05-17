import { BigNumber } from "bignumber.js";
import { addBigNumbers } from "../../utils/bigNumberUtils";
import envConfigs from "../../configs/envConfigs";
import TokenPriceHistory from "../../models/tokenPriceHistoryModel";
import marketCapService from "./marketCapService";
import tokenRegistryService from "../db/tokenRegistryService";

class AssetValuationService {
  /**
   * Calculates the total value of fund assets in SOL
   * @param assets Array of fund assets
   * @returns Total value in SOL as a string
   */
  static async calculateTotalAssetValueInSOL(assets: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
  }>): Promise<string> {
    let totalAssetValueInSOL = "0";
    
    // Get token addresses for bulk query
    const tokenAddresses = assets.map(asset => asset.tokenAddress);
    
    // Get latest prices for all tokens in one query
    const latestPrices = await this.getLatestTokenPrices(tokenAddresses);
    
    // Get SOL price in USD for conversion
    const solPrice = latestPrices[envConfigs.solTokenAddress || ''];
    if (!solPrice || Number(solPrice) <= 0) {
      throw new Error("Could not get SOL price for asset valuation");
    }
    
    // Process each asset
    for (const asset of assets) {
      const tokenAddress = asset.tokenAddress;
      
      if (tokenAddress === envConfigs.solTokenAddress) {
        // SOL assets are already in SOL
        totalAssetValueInSOL = addBigNumbers(totalAssetValueInSOL, asset.amount);
      } else {
        // For other tokens, get their USD price and convert to SOL equivalent
        const tokenPrice = latestPrices[tokenAddress];
        
        if (tokenPrice && Number(tokenPrice) > 0) {
          // Calculate: tokenAmount * (tokenPriceUSD / solPriceUSD)
          const tokenValueInSOL = new BigNumber(asset.amount)
            .multipliedBy(new BigNumber(tokenPrice))
            .dividedBy(new BigNumber(solPrice))
            .toString();
          
          totalAssetValueInSOL = addBigNumbers(totalAssetValueInSOL, tokenValueInSOL);
        }
      }
    }
    
    return totalAssetValueInSOL;
  }
  
  /**
   * Get latest prices for multiple tokens in one query
   */
  public static async getLatestTokenPrices(tokenAddresses: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    // Get the latest price for each token from our database
    const latestPrices = await TokenPriceHistory.aggregate([
      { $match: { tokenAddress: { $in: tokenAddresses } } },
      { $sort: { timestamp: -1 } },
      { 
        $group: { 
          _id: "$tokenAddress", 
          price: { $first: "$price" },
          timestamp: { $first: "$timestamp" }
        } 
      }
    ]);
    
    
    // Create a map of token address to price
    for (const priceData of latestPrices) {
      result[priceData._id] = priceData.price;
    }
    
    // For any tokens without prices, try to get from market cap service
    const missingTokens = tokenAddresses.filter(addr => !result[addr]);
    
    if (missingTokens.length > 0) {
      console.log("Missing prices for tokens:", missingTokens);
      
      // Get token symbols for missing tokens
      for (const tokenAddress of missingTokens) {
        try {
          // First try to get from token registry
          const token = await tokenRegistryService.getTokenByAddress(tokenAddress);
          
          if (token && token.symbol) {
            // Get price from market cap service
            const price = await marketCapService.getTokenPrice(token.symbol);
            
            if (price && Number(price) > 0) {
              result[tokenAddress] = price;
              
              // Save to our database for future use
              await TokenPriceHistory.create({
                tokenAddress: tokenAddress,
                price: price,
                timestamp: new Date()
              });
            }
          }
        } catch (error) {
          console.error(`Error getting price for token ${tokenAddress}:`, error);
        }
      }
    }
    
    // Ensure we have SOL price
    if (!result[envConfigs.solTokenAddress || '']) {
      const solPrice = await marketCapService.getTokenPrice("SOL");
      if (solPrice && Number(solPrice) > 0) {
        result[envConfigs.solTokenAddress || ''] = solPrice;
        
        // Save SOL price to database
        await TokenPriceHistory.create({
          tokenAddress: envConfigs.solTokenAddress || '',
          price: solPrice,
          timestamp: new Date()
        });
      }
    }
    return result;
  }
  
  /**
   * Calculates the fund token price based on total assets and supply
   * @param assets Array of fund assets
   * @param fundTokens Total fund tokens in circulation
   * @returns Fund token price in SOL
   */
  static async calculateFundTokenPrice(assets: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    amount: string;
  }>, fundTokens: string): Promise<string> {
    // Default price for new funds or zero supply
    if (!fundTokens || Number(fundTokens) <= 0) {
      return "1"; // Default 1:1 with SOL for new funds
    }
    
    try {
      const totalAssetValueInSOL = await this.calculateTotalAssetValueInSOL(assets);
      
      // Calculate fund token price: TVL in SOL / Total Fund Tokens
      return new BigNumber(totalAssetValueInSOL)
        .dividedBy(new BigNumber(fundTokens))
        .toString();
    } catch (error) {
      console.error("Error calculating fund token price:", error);
      return "1"; // Fallback to 1:1 with SOL if calculation fails
    }
  }
}

export default AssetValuationService; 