import mongoose, { InferSchemaType } from "mongoose";

const fundAssetHistorySchema = new mongoose.Schema({
  // Fund reference
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
    index: true
  },
  
  // Token information
  tokenAddress: {
    type: String,
    required: true,
    index: true
  },
  
  tokenSymbol: {
    type: String,
    required: true
  },
  
  // Amount before the change
  amountBefore: {
    type: String,
    required: true
  },
  
  // Amount after the change
  amountAfter: {
    type: String,
    required: true
  },
  
  // Change amount (can be positive or negative)
  changeAmount: {
    type: String,
    required: true
  },
  
  // Token price at the time of change
  tokenPrice: {
    type: String,
    required: true
  },
  
  // Type of operation that caused the change
  operationType: {
    type: String,
    enum: ['buy', 'sell', 'trade_in', 'trade_out', 'fee', 'other'],
    required: true
  },
  
  // Reference to related transaction (if applicable)
  relatedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'transactionType'
  },
  
  // Type of the related transaction
  transactionType: {
    type: String,
    enum: ['Ledger', 'Trade'],
    required: function() {
      return !!this.relatedTransactionId;
    }
  },
  
  // Notes about the change
  notes: {
    type: String
  },
  
  // Timestamp of the change
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient querying
fundAssetHistorySchema.index({ fundId: 1, tokenAddress: 1, timestamp: -1 });
fundAssetHistorySchema.index({ fundId: 1, timestamp: -1 });

export type IFundAssetHistory = InferSchemaType<typeof fundAssetHistorySchema>;
const FundAssetHistory = mongoose.model("FundAssetHistory", fundAssetHistorySchema);

export default FundAssetHistory; 