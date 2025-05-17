import { Types } from "mongoose";

export interface IUserHolding {
  userId: Types.ObjectId;
  fundId: Types.ObjectId;
  fundTokenBalance: string;
  initialInvestmentAmount: string;
  tokenAddress: string;
  entryPrice: string;
  lastUpdatedAt?: Date;
}

export interface IUserHoldingResponse extends IUserHolding {
  fund?: {
    fundName: string;
    fundTicker: string;
    fundLogoUrl: string;
  };
} 