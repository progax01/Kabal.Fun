import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import catchAsyncError from "./catchAsyncError";
import { Response, NextFunction } from "express";
import errorHandler from "../helpers/errorHandler";
import userServices from "../services/db/userServices";

const authenticateUser = catchAsyncError(
  async (req: any, res: Response, next: NextFunction) => {
    const { wallet_address: walletAddress, auth_token: authToken } =
      req.headers;

    console.log("req.headers: ", req.headers);
    console.log("walletAddress: ", walletAddress);
    console.log("authToken: ", authToken);
    if (!walletAddress || !authToken) {
      return next(
        errorHandler(
          401,
          "Unauthorized: Missing key wallet-address or auth-token."
        )
      );
    }
    const user = await userServices.getUserByAddressAndToken(
      walletAddress as string,
      authToken as string
    );

    if (user && user.authExpiryDate > new Date()) {
      req.user = user;
      return next();
    }
    return next(
      errorHandler(401, "Unauthorized: Invalid or Expired auth token.")
    );
  }
);

export default authenticateUser;
