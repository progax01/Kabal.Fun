import mongoose, { InferSchemaType } from "mongoose";

const fundPriceHistorySchema = new mongoose.Schema({
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
  },
  tokenPrice: {
    type: String,
    required: true,
  },
  aum: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Index for efficient time-series queries
fundPriceHistorySchema.index({ fundId: 1, timestamp: -1 });

export type IFundPriceHistory = InferSchemaType<typeof fundPriceHistorySchema>;
const FundPriceHistory = mongoose.model("FundPriceHistory", fundPriceHistorySchema);

export default FundPriceHistory; 