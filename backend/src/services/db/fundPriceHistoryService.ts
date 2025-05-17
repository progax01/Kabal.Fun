import FundPriceHistory from "../../models/fundPriceHistoryModel";
import AssetValuationService from "../price/assetValuationService";
import { Types } from "mongoose";

class FundPriceHistoryService {
  /**
   * Record a new price point for a fund
   */
  static async recordFundPrice(
    fundId: string | Types.ObjectId,
    assets: any[],
    fundTokens: string
  ) {
    try {
      const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
      
      // Calculate token price
      const tokenPrice = await AssetValuationService.calculateFundTokenPrice(
        assets || [],
        fundTokens || "0"
      );
      
      // Calculate AUM in SOL
      const aum = await AssetValuationService.calculateTotalAssetValueInSOL(
        assets || []
      );
      
      // Create a new price history entry
      await FundPriceHistory.create({
        fundId: fundObjectId,
        tokenPrice,
        aum,
        timestamp: new Date()
      });
      
      return { tokenPrice, aum };
    } catch (error: any) {
      console.error(`Error recording fund price: ${error.message}`);
      throw new Error(`Failed to record fund price: ${error.message}`);
    }
  }
  
  /**
   * Get the latest price entry for a fund
   */
  static async getLatestPrice(fundId: string | Types.ObjectId) {
    const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
    
    return await FundPriceHistory.findOne({ fundId: fundObjectId })
      .sort({ timestamp: -1 })
      .lean();
  }
  
  /**
   * Get price history for a fund within a time range
   */
  static async getPriceHistory(
    fundId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date = new Date()
  ) {
    const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
    
    return await FundPriceHistory.find({
      fundId: fundObjectId,
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .sort({ timestamp: 1 })
    .lean();
  }
}

export default FundPriceHistoryService; 