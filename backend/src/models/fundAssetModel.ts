import mongoose, { InferSchemaType } from "mongoose";

const fundAssetSchema = new mongoose.Schema({
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
  },
  tokenAddress: {
    type: String,
    required: true,
  },
  tokenSymbol: {
    type: String,
    required: true,
  },
  quantity: {
    type: String,
    required: true,
  },
  lastUpdatedPrice: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Compound index to ensure unique token per fund
fundAssetSchema.index({ fundId: 1, tokenAddress: 1 }, { unique: true });

export type IFundAsset = InferSchemaType<typeof fundAssetSchema>;
const FundAsset = mongoose.model("FundAsset", fundAssetSchema);

export default FundAsset; 