import { Types } from "mongoose";
import FundAssetHistory from "../../models/fundAssetHistoryModel";
import { BigNumber } from "bignumber.js";
import tokenRegistryService from "./tokenRegistryService";

interface ICreateAssetHistoryData {
  fundId: Types.ObjectId | string;
  tokenAddress: string;
  tokenSymbol: string;
  amountBefore: string;
  amountAfter: string;
  tokenPrice: string;
  operationType: 'buy' | 'sell' | 'trade_in' | 'trade_out' | 'fee' | 'other';
  relatedTransactionId?: Types.ObjectId | string;
  transactionType?: 'Ledger' | 'Trade';
  notes?: string;
}

class FundAssetHistoryService {
  /**
   * Create a new asset history entry
   */
  static async createAssetHistory(data: ICreateAssetHistoryData) {
    try {
      // Calculate change amount
      const amountBeforeBN = new BigNumber(data.amountBefore);
      const amountAfterBN = new BigNumber(data.amountAfter);
      const changeAmount = amountAfterBN.minus(amountBeforeBN).toString();
      
      const historyEntry = new FundAssetHistory({
        ...data,
        changeAmount,
        timestamp: new Date()
      });
      
      return await historyEntry.save();
    } catch (error: any) {
      console.error('Error creating asset history:', error);
      throw new Error(`Failed to create asset history: ${error.message}`);
    }
  }
  /**
   * Create a new asset history record
   */
  static async create(
    fundId: Types.ObjectId | string,
    tokenAddress: string,
    tokenSymbol: string,
    previousQuantity: string,
    newQuantity: string,
    operation: 'add' | 'subtract',
    operationType: string,
    relatedTransactionId: Types.ObjectId | string,
    transactionType: 'Ledger' | 'Trade'
  ) {
    try {
      // Get token price (you may need to implement this)
      const tokenPrice = await tokenRegistryService.getTokenPrice(tokenAddress) || "0";
      
      // Calculate change amount
      const changeAmount = operation === 'add'
        ? new BigNumber(newQuantity).minus(previousQuantity).toString()
        : new BigNumber(previousQuantity).minus(newQuantity).toString();
      
      return await FundAssetHistory.create({
        fundId,
        tokenAddress,
        tokenSymbol,
        amountBefore: previousQuantity,
        amountAfter: newQuantity,
        changeAmount,
        tokenPrice,
        operation,
        operationType,
        relatedTransactionId,
        transactionType,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error(`Error creating asset history: ${error.message}`);
      throw new Error(`Failed to create asset history: ${error.message}`);
    }
  }
  
  /**
   * Get asset history for a specific fund
   */
  static async getAssetHistoryByFund(
    fundId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
      
      const skip = (page - 1) * limit;
      
      const history = await FundAssetHistory.find({ fundId: fundObjectId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'relatedTransactionId',
          select: 'amount method timestamp'
        });
      
      const total = await FundAssetHistory.countDocuments({ fundId: fundObjectId });
      
      return { history, total, page, limit };
    } catch (error: any) {
      console.error('Error getting asset history:', error);
      throw new Error(`Failed to get asset history: ${error.message}`);
    }
  }
  
  /**
   * Get asset history for a specific token in a fund
   */
  static async getAssetHistoryByToken(
    fundId: string | Types.ObjectId,
    tokenAddress: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
      
      const skip = (page - 1) * limit;
      
      const history = await FundAssetHistory.find({ 
        fundId: fundObjectId,
        tokenAddress
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'relatedTransactionId',
          select: 'amount method timestamp'
        });
      
      const total = await FundAssetHistory.countDocuments({ 
        fundId: fundObjectId,
        tokenAddress
      });
      
      return { history, total, page, limit };
    } catch (error: any) {
      console.error('Error getting token asset history:', error);
      throw new Error(`Failed to get token asset history: ${error.message}`);
    }
  }
  
  /**
   * Get asset performance over time
   */
  static async getAssetPerformance(
    fundId: string | Types.ObjectId,
    tokenAddress: string,
    startDate: Date,
    endDate: Date = new Date()
  ) {
    try {
      const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
      
      // Get the earliest and latest entries within the date range
      const startEntry = await FundAssetHistory.findOne({
        fundId: fundObjectId,
        tokenAddress,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });
      
      const endEntry = await FundAssetHistory.findOne({
        fundId: fundObjectId,
        tokenAddress,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: -1 });
      
      if (!startEntry || !endEntry) {
        return {
          tokenAddress,
          startAmount: "0",
          endAmount: "0",
          startPrice: "0",
          endPrice: "0",
          amountChange: "0",
          amountChangePercent: "0",
          priceChange: "0",
          priceChangePercent: "0",
          valueChange: "0",
          valueChangePercent: "0"
        };
      }
      
      // Calculate changes
      const startAmount = startEntry.amountBefore;
      const endAmount = endEntry.amountAfter;
      const startPrice = startEntry.tokenPrice;
      const endPrice = endEntry.tokenPrice;
      
      const startAmountBN = new BigNumber(startAmount);
      const endAmountBN = new BigNumber(endAmount);
      const startPriceBN = new BigNumber(startPrice);
      const endPriceBN = new BigNumber(endPrice);
      
      // Amount change
      const amountChange = endAmountBN.minus(startAmountBN).toString();
      const amountChangePercent = startAmountBN.isZero() 
        ? "0" 
        : endAmountBN.minus(startAmountBN)
            .dividedBy(startAmountBN)
            .multipliedBy(100)
            .toString();
      
      // Price change
      const priceChange = endPriceBN.minus(startPriceBN).toString();
      const priceChangePercent = startPriceBN.isZero()
        ? "0"
        : endPriceBN.minus(startPriceBN)
            .dividedBy(startPriceBN)
            .multipliedBy(100)
            .toString();
      
      // Value change (amount * price)
      const startValue = startAmountBN.multipliedBy(startPriceBN);
      const endValue = endAmountBN.multipliedBy(endPriceBN);
      const valueChange = endValue.minus(startValue).toString();
      const valueChangePercent = startValue.isZero()
        ? "0"
        : endValue.minus(startValue)
            .dividedBy(startValue)
            .multipliedBy(100)
            .toString();
      
      return {
        tokenAddress,
        startAmount,
        endAmount,
        startPrice,
        endPrice,
        amountChange,
        amountChangePercent,
        priceChange,
        priceChangePercent,
        valueChange,
        valueChangePercent
      };
    } catch (error: any) {
      console.error('Error getting asset performance:', error);
      throw new Error(`Failed to get asset performance: ${error.message}`);
    }
  }
}

export default FundAssetHistoryService; 