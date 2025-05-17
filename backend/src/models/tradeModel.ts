import mongoose, { InferSchemaType, Model } from "mongoose";
import { ITradeDocument, ITradeModel } from "../helpers/types/tradeTypes";

const tradeSchema = new mongoose.Schema({
  // Fund that executed the trade
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: [true, "Fund ID is required."]
  },
  
  // Manager who executed the trade
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Manager ID is required."]
  },
  
  // Source token details
  fromTokenAddress: {
    type: String,
    required: [true, "Source token address is required."]
  },
  
  fromTokenSymbol: {
    type: String,
    required: [true, "Source token symbol is required."]
  },
  
  fromAmount: {
    type: String,
    required: [true, "Source token amount is required."]
  },
  
  fromTokenPrice: {
    type: String,
    required: [true, "Source token price is required."]
  },
  
  // Destination token details
  toTokenAddress: {
    type: String,
    required: [true, "Destination token address is required."]
  },
  
  toTokenSymbol: {
    type: String,
    required: [true, "Destination token symbol is required."]
  },
  
  toAmount: {
    type: String,
    required: [true, "Destination token amount is required."]
  },
  
  toTokenPrice: {
    type: String,
    required: [true, "Destination token price is required."]
  },
  
  // Trade execution details
  slippage: {
    type: Number,
    required: [true, "Slippage percentage is required."],
    default: 1.0 // 1% default slippage
  },
  
  executedAt: {
    type: Date,
    default: Date.now
  },
  
  // Fund token price before and after trade
  fundTokenPriceBefore: {
    type: String,
    required: [true, "Fund token price before trade is required."]
  },
  
  fundTokenPriceAfter: {
    type: String,
    required: [true, "Fund token price after trade is required."]
  },
  
  // Status of the trade
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  
  // Optional notes about the trade
  notes: {
    type: String
  },
  
  // Add this field to the tradeSchema
  routeInfo: {
    type: String, // Store as JSON string
    required: false
  }
}, {
  timestamps: true
});

// Add indexes for efficient querying
tradeSchema.index({ fundId: 1, executedAt: -1 });
tradeSchema.index({ managerId: 1, executedAt: -1 });
tradeSchema.index({ fromTokenSymbol: 1, toTokenSymbol: 1 });

export type ITrade = InferSchemaType<typeof tradeSchema>;
const Trade = mongoose.model<ITradeDocument, ITradeModel>("Trade", tradeSchema);

export default Trade; 