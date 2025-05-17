import UserHolding from "../../models/userHoldingModel";
import { IUpdateUserHoldingData } from "../../helpers/types/ledgerTypes";
import { addBigNumbers, subtractBigNumbers } from "../../utils/bigNumberUtils";
import { Types } from "mongoose";
import userModel from "../../models/userModel";

class userHoldingServices {
  static async updateUserHolding(data: IUpdateUserHoldingData, price: string) {
    const { userId, fundId, amount, method, tokenAddress } = data;

    let userHolding = await UserHolding.findOne({ userId, fundId });

    if (!userHolding) {
      // Create new holding if it doesn't exist
      userHolding = await UserHolding.create({
        userId,
        fundId,
        fundTokenBalance: method === 'buy' ? amount : '0',
        initialInvestmentAmount: amount,
        entryPrice: price || "1", // You might want to get actual token price
        tokenAddress
      });
    } else {
      // Update existing holding
      if (method === 'buy') {
        userHolding.fundTokenBalance = addBigNumbers(userHolding.fundTokenBalance, amount);
        userHolding.initialInvestmentAmount = addBigNumbers(userHolding.initialInvestmentAmount, amount);
      } else {
        userHolding.fundTokenBalance = subtractBigNumbers(userHolding.fundTokenBalance, amount);
      }
      userHolding.lastUpdatedAt = new Date();
      await userHolding.save();
    }

    return userHolding;
  }

  static async getUserHoldings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const holdings = await UserHolding.find({ userId })
      .populate('fundId', 'fundName fundTicker fundLogoUrl')
      .skip(skip)
      .limit(limit)
      .sort({ lastUpdatedAt: -1 });

    const holdingsCount = await UserHolding.countDocuments({ userId });

    return { holdings, holdingsCount };
  }

  static async getFundHolders(fundId: string | Types.ObjectId, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const holdings = await UserHolding.find({ fundId })
        .sort({ fundTokenBalance: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      const holdersCount = await UserHolding.countDocuments({ fundId });
      
      const holders = await Promise.all(holdings.map(async (holding) => {
        const user = await userModel.findById(holding.userId).lean();
        return {
          ...holding,
          user
        };
      }));
      
      return { holders, holdersCount };
    } catch (err: any) {
      throw new Error(`Error getting fund holders: ${err.message}`);
    }
  }

  static async getUserHoldingByFund(userId: string, fundId: string) {
    try {
      return await UserHolding.findOne({ 
        userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
        fundId: typeof fundId === 'string' ? new Types.ObjectId(fundId) : fundId
      });
    } catch (err: any) {
      throw new Error(`Error getting user holding: ${err.message}`);
    }
  }
}

export default userHoldingServices; 