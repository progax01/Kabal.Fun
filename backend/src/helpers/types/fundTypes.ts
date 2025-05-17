import mongoose, { Document, Model } from "mongoose";

export type FundStatus = "fundraising" | "trading" | "expired";

export interface ICreateFundData {
  managerId: mongoose.Types.ObjectId;
  fundName: string;
  fundTicker: string;
  fundDescription: string;
  fundLogoUrl: string;
  targetRaiseAmount: string;
  annualManagementFee: number;
  onChainFundId: string;
  fundContractAddress: string;
  fundTokenAddress: string;
  websiteUrl?: string;
  telegramUrl?: string;
  twitterHandle?: string;
  fundTokens?: string;
  isActive?: boolean;
  createdAt?: Date;
  thresholdDeadline?: Date;
  expirationDate?: Date;
  fundStatus?: FundStatus;
  managerTelegramUsername?: string;
  telegramGroupId?: string;
  telegramGroupTitle?: string;
}

export interface IFundAsset {
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
}

export interface IFundProgress {
  current: string;
  target: string;
  percentage: string;
}

export interface IFundPerformance {
  tokenPrice: string;
  aum: string;
}

export interface IFundDocument extends Document {
  managerId: mongoose.Types.ObjectId;
  fundName: string;
  fundTicker: string;
  fundDescription: string;
  fundLogoUrl: string;
  targetRaiseAmount: string;
  assets: IFundAsset[];
  fundTokens: string;
  annualManagementFee: number;
  onChainFundId: string;
  fundContractAddress: string;
  fundTokenAddress: string;
  websiteUrl?: string;
  telegramUrl?: string;
  twitterHandle?: string;
  createdAt: Date;
  thresholdDeadline: Date;
  expirationDate: Date;
  isActive: boolean;
  fundStatus: FundStatus;
  progress?: IFundProgress;
  performance?: IFundPerformance;
  telegramGroupId?: string;
  telegramGroupTitle?: string;
  updateAsset(
    tokenAddress: string,
    tokenSymbol: string,
    amount: string,
    operation: "add" | "subtract",
    operationType?: "buy" | "sell" | "trade_in" | "trade_out" | "fee" | "other",
    relatedTransactionId?: mongoose.Types.ObjectId | string,
    transactionType?: "Ledger" | "Trade"
  ): Promise<IFundDocument>;
}

export interface IFundModel extends Model<IFundDocument> {
  searchByName(
    searchText: string
  ): mongoose.Query<IFundDocument[], IFundDocument>;
}
