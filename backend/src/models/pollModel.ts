import mongoose, { Document, Schema } from "mongoose";
import { Types } from "mongoose";

export interface IPollOption {
  text: string;
  voter_count: number;
}

export interface IPollDocument extends Document {
  fundId: Types.ObjectId;
  telegramGroupId: string;
  pollId: string;
  messageId: number;
  question: string;
  options: IPollOption[];
  totalVoterCount: number;
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
  isClosed: boolean;
  createdAt: Date;
  closedAt?: Date;
}

const pollOptionSchema = new Schema<IPollOption>({
  text: { type: String, required: true },
  voter_count: { type: Number, default: 0 },
});

const pollSchema = new Schema<IPollDocument>({
  fundId: { type: Schema.Types.ObjectId, ref: "Fund", required: true },
  telegramGroupId: { type: String, required: true },
  pollId: { type: String, required: true, unique: true },
  messageId: { type: Number, required: true },
  question: { type: String, required: true },
  options: [pollOptionSchema],
  totalVoterCount: { type: Number, default: 0 },
  isAnonymous: { type: Boolean, default: true },
  allowsMultipleAnswers: { type: Boolean, default: false },
  isClosed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

// Add indexes for faster queries
pollSchema.index({ fundId: 1 });
pollSchema.index({ telegramGroupId: 1 });
pollSchema.index({ pollId: 1 }, { unique: true });

export default mongoose.model<IPollDocument>("Poll", pollSchema);
