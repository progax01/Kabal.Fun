import mongoose, { InferSchemaType, Model } from "mongoose";
import { IFundDocument, IFundModel } from "../helpers/types/fundTypes";
import { addBigNumbers, subtractBigNumbers } from "../utils/bigNumberUtils";
import fundAssetHistoryService from "../services/db/fundAssetHistoryService";
import marketCapService from "../services/price/marketCapService";
import { Types } from "mongoose";

// Define the asset structure within the fund
const fundAssetSchema = new mongoose.Schema(
  {
    tokenAddress: {
      type: String,
      required: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
      default: "0",
    },
  },
  { _id: false }
);

const fundSchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Fund manager ID is required."],
  },
  fundName: {
    type: String,
    required: [true, "Fund name is required."],
  },
  fundTicker: {
    type: String,
    required: [true, "Fund ticker is required."],
    unique: true,
  },
  fundDescription: {
    type: String,
    required: [true, "Fund description is required."],
  },
  fundLogoUrl: {
    type: String,
    required: [true, "Fund logo is required."],
  },
  targetRaiseAmount: {
    type: String,
    required: [true, "Target raise amount is required."],
  },
  // Track assets in the fund
  assets: {
    type: [fundAssetSchema],
    default: [],
  },
  // Track fund tokens instead of AUM
  fundTokens: {
    type: String,
    required: false,
    default: "0",
  },
  annualManagementFee: {
    type: Number,
    required: [true, "Management fee percentage is required."],
  },
  onChainFundId: {
    type: String,
    required: [true, "On-chain fund ID is required."],
    unique: true,
  },
  fundContractAddress: {
    type: String,
    required: [true, "Fund smart contract address is required."],
  },
  fundTokenAddress: {
    type: String,
    required: [true, "Fund token address is required."],
    unique: true,
  },
  websiteUrl: {
    type: String,
  },
  telegramUrl: {
    type: String,
  },
  twitterHandle: {
    type: String,
  },
  createdAt: {
    type: Date,
    required: false,
    default: Date.now,
  },
  thresholdDeadline: {
    type: Date,
    required: false,
    default: function () {
      // Set fundraising deadline to 3 days from creation
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);
      return deadline;
    },
  },
  expirationDate: {
    type: Date,
    required: false,
    default: function () {
      // Set fund expiration to 3 months from creation
      const expiration = new Date();
      expiration.setMonth(expiration.getMonth() + 3);
      return expiration;
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  fundStatus: {
    type: String,
    enum: ["fundraising", "trading", "expired"],
    default: "fundraising",
  },
  managerTelegramUsername: {
    type: String,
    trim: true,
  },
  telegramGroupId: {
    type: String,
    trim: true,
  },
  telegramGroupTitle: {
    type: String,
    trim: true,
  },
});

// Add an index for efficient querying of funds by status and deadlines
fundSchema.index({ fundStatus: 1, thresholdDeadline: 1, expirationDate: 1 });

// Add new indexes
fundSchema.index({ fundName: 1 }, { collation: { locale: "en", strength: 2 } });

// Add these indexes to your fund schema
fundSchema.index({ fundStatus: 1, isActive: 1 });
fundSchema.index({ managerId: 1 });
fundSchema.index({ createdAt: -1 });
fundSchema.index({ fundContractAddress: 1 }, { unique: true });
fundSchema.index({ fundName: "text", fundTicker: "text" });

// Add methods for name search
fundSchema.statics.searchByName = function (searchText: string) {
  return this.find({
    $or: [
      { fundName: new RegExp(searchText, "i") },
      { $text: { $search: searchText } },
    ],
  }).sort({
    score: { $meta: "textScore" },
  });
};

// Method to update fund assets
fundSchema.methods.updateAsset = async function (
  tokenAddress: string,
  tokenSymbol: string,
  amount: string,
  operation: "add" | "subtract",
  operationType:
    | "buy"
    | "sell"
    | "trade_in"
    | "trade_out"
    | "fee"
    | "other" = "other",
  relatedTransactionId?: Types.ObjectId | string,
  transactionType?: "Ledger" | "Trade"
) {
  // Find the asset in the fund's assets array
  const assetIndex = this.assets.findIndex(
    (asset: any) => asset.tokenAddress === tokenAddress
  );

  // Get current token price
  let tokenPrice = "0";
  try {
    tokenPrice = await marketCapService.getTokenPrice(tokenSymbol);
  } catch (error) {
    console.error(`Error getting price for ${tokenSymbol}:`, error);
  }

  // If asset exists, update it
  if (assetIndex !== -1) {
    const currentAmount = this.assets[assetIndex].amount;
    let newAmount;

    if (operation === "add") {
      newAmount = addBigNumbers(currentAmount, amount);
    } else {
      newAmount = subtractBigNumbers(currentAmount, amount);
    }

    // Record asset history before updating
    await fundAssetHistoryService.createAssetHistory({
      fundId: this._id,
      tokenAddress,
      tokenSymbol,
      amountBefore: currentAmount,
      amountAfter: newAmount,
      tokenPrice,
      operationType,
      relatedTransactionId,
      transactionType,
      notes: `${
        operation === "add" ? "Added" : "Removed"
      } ${amount} ${tokenSymbol}`,
    });

    // Update the asset amount
    this.assets[assetIndex].amount = newAmount;
  } else {
    // If asset doesn't exist, add it (only for 'add' operation)
    if (operation === "add") {
      // Record asset history for new asset
      await fundAssetHistoryService.createAssetHistory({
        fundId: this._id,
        tokenAddress,
        tokenSymbol,
        amountBefore: "0",
        amountAfter: amount,
        tokenPrice,
        operationType,
        relatedTransactionId,
        transactionType,
        notes: `Added new asset: ${amount} ${tokenSymbol}`,
      });

      this.assets.push({
        tokenAddress,
        tokenSymbol,
        amount,
      });
    } else {
      throw new Error(
        `Cannot subtract from non-existent asset: ${tokenSymbol}`
      );
    }
  }

  // Save the updated fund
  await this.save();
  return this;
};

export type IFund = InferSchemaType<typeof fundSchema>;
const Fund = mongoose.model<IFundDocument, IFundModel>("Fund", fundSchema);

export default Fund;
