import { Types } from "mongoose";
import { Document, Model } from "mongoose";

export interface ICreateTradeData {
  fundId: Types.ObjectId | string;
  managerId: Types.ObjectId | string;
  fromTokenAddress: string;
  fromTokenSymbol: string;
  fromAmount: string;
  fromTokenPrice: string;
  toTokenAddress: string;
  toTokenSymbol: string;
  toAmount: string;
  toTokenPrice: string;
  slippage?: number;
  fundTokenPriceBefore: string;
  fundTokenPriceAfter: string;
  notes?: string;
  routeInfo?: string;
}

export interface ITradeDocument extends Document {
  fundId: Types.ObjectId;
  managerId: Types.ObjectId;
  fromTokenAddress: string;
  fromTokenSymbol: string;
  fromAmount: string;
  fromTokenPrice: string;
  toTokenAddress: string;
  toTokenSymbol: string;
  toAmount: string;
  toTokenPrice: string;
  slippage: number;
  executedAt: Date;
  fundTokenPriceBefore: string;
  fundTokenPriceAfter: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  routeInfo?: string;
}

export interface ITradeModel extends Model<ITradeDocument> {
  // Add any static methods here
} 