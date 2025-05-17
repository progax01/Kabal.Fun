import { Types } from "mongoose";
import { Document, Model } from "mongoose";

export type LedgerMethod = 'buy' | 'sell';

export interface ICreateLedgerData {
  fundId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  amount: string;
  method: LedgerMethod;
  tokenAddress: string;
  tokenSymbol: string;
  price: string;
  fundTokenPrice?: string; // Price of the fund token
  fundTokensAmount?: string; // Amount of fund tokens involved
  transactionFee?: string;
  carryFee?: string;
  timestamp?: Date;
}

export interface ILedgerDocument extends Document {
  fundId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: string;
  method: LedgerMethod;
  tokenAddress: string;
  tokenSymbol: string;
  price: string;
  timestamp: Date;
}

export interface ILedgerModel extends Model<ILedgerDocument> {
  // Add any static methods here
}

export interface IUpdateUserHoldingData {
  userId: Types.ObjectId | string;
  fundId: Types.ObjectId | string;
  amount: string;
  method: LedgerMethod;
  tokenAddress: string;
  tokenSymbol: string;
} 