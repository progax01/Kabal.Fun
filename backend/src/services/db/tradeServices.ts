import { Types } from "mongoose";
import Trade from "../../models/tradeModel";
import { ICreateTradeData } from "../../helpers/types/tradeTypes";

class TradeServices {
  static createTrade = async (tradeData: ICreateTradeData) => {
    try {
      const trade = new Trade(tradeData);
      return await trade.save();
    } catch (err: any) {
      throw new Error(`Error while creating trade: ${err.message}`);
    }
  };

  static getTradesByFund = async (fundId: string | Types.ObjectId, page: number, limit: number) => {
    const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
    try {
      const pageNo = page || 1;
      const itemsLimit = limit || 10;
      const tradesCount = await Trade
        .find({ fundId: fundObjectId })
        .sort({ executedAt: -1 })
        .countDocuments();
      
      const trades = await Trade
        .find({ fundId: fundObjectId })
        .sort({ executedAt: -1 })
        .skip(itemsLimit * (pageNo - 1))
        .limit(itemsLimit);
      
      return { trades, tradesCount };
    } catch (err: any) {
      throw new Error(`Error while getting trades by fund: ${err.message}`);
    }
  };

  static getTradesByManager = async (managerId: string | Types.ObjectId, page: number, limit: number) => {
    const managerObjectId = typeof managerId === 'string' ? new Types.ObjectId(managerId) : managerId;
    try {
      const pageNo = page || 1;
      const itemsLimit = limit || 10;
      const tradesCount = await Trade
        .find({ managerId: managerObjectId })
        .sort({ executedAt: -1 })
        .countDocuments();
      
      const trades = await Trade
        .find({ managerId: managerObjectId })
        .populate('fundId', 'fundName fundTicker')
        .sort({ executedAt: -1 })
        .skip(itemsLimit * (pageNo - 1))
        .limit(itemsLimit);
      
      return { trades, tradesCount };
    } catch (err: any) {
      throw new Error(`Error while getting trades by manager: ${err.message}`);
    }
  };

  static getTradeById = async (tradeId: string | Types.ObjectId) => {
    try {
      return await Trade.findById(tradeId);
    } catch (err: any) {
      throw new Error(`Error while getting trade by ID: ${err.message}`);
    }
  };

  static getTradeStats = async (fundId: string | Types.ObjectId) => {
    const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
    try {
      // Get total number of trades
      const totalTrades = await Trade.countDocuments({ fundId: fundObjectId });
      
      // Get trades by token pairs
      const tokenPairStats = await Trade.aggregate([
        { $match: { fundId: fundObjectId } },
        { 
          $group: { 
            _id: { 
              fromToken: "$fromTokenSymbol", 
              toToken: "$toTokenSymbol" 
            },
            count: { $sum: 1 },
            totalFromAmount: { $sum: { $toDouble: "$fromAmount" } },
            totalToAmount: { $sum: { $toDouble: "$toAmount" } },
            lastTrade: { $max: "$executedAt" }
          } 
        },
        { $sort: { count: -1 } }
      ]);
      
      // Get most traded tokens
      const mostTradedTokens = await Trade.aggregate([
        { $match: { fundId: fundObjectId } },
        { 
          $group: { 
            _id: "$fromTokenSymbol",
            count: { $sum: 1 },
            totalAmount: { $sum: { $toDouble: "$fromAmount" } }
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      return {
        totalTrades,
        tokenPairStats,
        mostTradedTokens
      };
    } catch (err: any) {
      throw new Error(`Error while getting trade stats: ${err.message}`);
    }
  };
}

export default TradeServices; 