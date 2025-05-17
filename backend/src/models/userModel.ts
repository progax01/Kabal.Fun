import mongoose, { InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: [true, "Wallet Address is required."],
      unique: [true, "Wallet address has to be unique."],
    },
    socials: [
      {
        social: {
          type: String,
          required: [true, "Social name is required."],
        },
        username: {
          type: String,
        },
        image: {
          type: String,
        },
        followers: {
          type: Number,
        },
        verifier: {
          type: String,
        },
      },
    ],
    authToken: {
      type: String,
    },
    authExpiryDate: {
      type: Date,
      default: () => {
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
  }
);

export type IUser = InferSchemaType<typeof userSchema>;
const userModel = mongoose.model("user", userSchema);
export default userModel;
