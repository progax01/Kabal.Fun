import mongoose, { Types } from "mongoose";
import ledgerModel from "../../models/ledgerModel";
import { ICreateLedgerData } from "../../helpers/types/ledgerTypes";

class ledgerServices {
  static createLedger = async (data: ICreateLedgerData) => {
    try {
      return await ledgerModel.create(data);
    } catch (err: any) {
      throw new Error(`Error while saving ledger: ${err.message}`);
    }
  };
  
  static getLedgerByFund = async (fundId: string | Types.ObjectId, page: number, limit: number) => {
    const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
    try {
      const pageNo = page || 1;
      const itemsLimit = limit || 10;
      const ledgersCount = await ledgerModel
        .find({ fundId: fundObjectId })
        .sort({ timestamp: -1 })
        .countDocuments();
      const ledgers = await ledgerModel
        .find({ fundId: fundObjectId })
        .sort({ timestamp: -1 })
        .skip(itemsLimit * (pageNo - 1))
        .limit(itemsLimit);
      return { ledgers, ledgersCount };
    } catch (err: any) {
      throw new Error(`Error while getting ledgers by fund: ${err.message}`);
    }
  };
  
  /**
   * Get ledger entries for a fund within a specific time range
   */
  static getLedgerByFundAndTimeRange = async (
    fundId: string | Types.ObjectId, 
    startDate: Date, 
    endDate: Date
  ) => {
    const fundObjectId = typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId;
    try {
      const ledgers = await ledgerModel
        .find({ 
          fundId: fundObjectId,
          timestamp: { $gte: startDate, $lte: endDate }
        })
        .sort({ timestamp: 1 }); // Sort by timestamp ascending
      
      const ledgersCount = ledgers.length;
      
      return { ledgers, ledgersCount };
    } catch (err: any) {
      throw new Error(`Error while getting ledgers by fund and time range: ${err.message}`);
    }
  };

  /**
   * Get total trading fees for a fund
   */
  static async getTotalTradingFees(fundId: string): Promise<string> {
    try {
      const result = await ledgerModel.aggregate([
        { $match: { fundId: new Types.ObjectId(fundId) } },
        { $group: { 
          _id: null, 
          totalFees: { $sum: { $toDouble: "$transactionFee" } } 
        }}
      ]);
      
      return result.length > 0 ? result[0].totalFees.toString() : "0";
    } catch (error) {
      console.error(`Error getting total trading fees: ${error}`);
      return "0";
    }
  }
}

export default ledgerServices;
