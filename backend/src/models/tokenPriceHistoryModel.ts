import mongoose, { InferSchemaType } from "mongoose";

const tokenPriceHistorySchema = new mongoose.Schema({
  tokenAddress: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient time-series queries
tokenPriceHistorySchema.index({ tokenAddress: 1, timestamp: -1 });

export type ITokenPriceHistory = InferSchemaType<typeof tokenPriceHistorySchema>;
const TokenPriceHistory = mongoose.model("TokenPriceHistory", tokenPriceHistorySchema);

export default TokenPriceHistory; 