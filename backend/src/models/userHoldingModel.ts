import mongoose, { InferSchemaType } from "mongoose";

const userHoldingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
  },
  fundTokenBalance: {
    type: String,
    required: true,
    default: "0",
  },
  initialInvestmentAmount: {
    type: String,
    required: true,
  },
  tokenAddress: {
    type: String,
    required: true,
  },
  entryPrice: {
    type: String,
    required: true,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Compound index for efficient queries
userHoldingSchema.index({ userId: 1, fundId: 1 }, { unique: true });
userHoldingSchema.index({ fundId: 1, fundTokenBalance: -1 });

export type IUserHolding = InferSchemaType<typeof userHoldingSchema>;
const UserHolding = mongoose.model("UserHolding", userHoldingSchema);

export default UserHolding; 