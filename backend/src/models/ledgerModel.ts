import mongoose, { InferSchemaType } from "mongoose";

const ledgerSchema = new mongoose.Schema({
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ['buy', 'sell'],
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
  price: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

ledgerSchema.index({ fundId: 1, createdAt: -1 });

export type ILedger = InferSchemaType<typeof ledgerSchema>;
const Ledger = mongoose.model("Ledger", ledgerSchema);

export default Ledger;
