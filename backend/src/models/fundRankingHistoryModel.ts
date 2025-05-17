import mongoose, { InferSchemaType } from "mongoose";

const fundRankingHistorySchema = new mongoose.Schema({
  // The date this ranking snapshot was taken
  snapshotDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // The type of ranking (price or aum)
  rankingType: {
    type: String,
    enum: ['price', 'aum'],
    required: true
  },
  
  // Array of fund rankings
  rankings: [{
    fundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fund',
      required: true
    },
    position: {
      type: Number,
      required: true
    }
  }],
  
  // When this record was created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient querying
fundRankingHistorySchema.index({ snapshotDate: -1, rankingType: 1 });

export type IFundRankingHistory = InferSchemaType<typeof fundRankingHistorySchema>;
const FundRankingHistory = mongoose.model("FundRankingHistory", fundRankingHistorySchema);

export default FundRankingHistory; 