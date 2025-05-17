import { Response, Request, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import userServices from "../services/db/userServices";
import bs58 from "bs58";
import nacl from "tweetnacl";
import errorHandler from "../helpers/errorHandler";
import { TwitterApi } from "twitter-api-v2";
import envConfigs from "../configs/envConfigs";
import axios from "axios";
import fundServices from "../services/db/fundServices";
import userHoldingServices from "../services/db/userHoldingServices";
import AssetValuationService from "../services/price/assetValuationService";
import BigNumber from "bignumber.js";
import telegramAuthService from "../services/telegram/telegramAuthService";
import userModel from "../models/userModel";

const twitterClient = new TwitterApi({
  clientId: envConfigs.twitterClientId,
  clientSecret: envConfigs.twitterClientSecret,
});

class userControllers {
  static loginUser = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { walletAddress, signature, message } = req.body;
      console.log("req.body: ", req.body);

      const walletAddressBytes = bs58.decode(walletAddress);
      // const signatureBytes = bs58.decode(signature);
      const signatureBytes = new Uint8Array(Buffer.from(signature, "hex"));
      const messageBytes = new TextEncoder().encode(message);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        walletAddressBytes
      );

      if (!isValid) {
        return next(errorHandler(401, "Unauthorizd: Invalid Signature."));
      }

      const authToken = bs58.encode(nacl.randomBytes(16));

      const user = await userServices.updateAuthToken(walletAddress, authToken);

      res.status(200).json({
        success: true,
        user: user,
        authToken,
        message: "User logged in successfully.",
      });
    }
  );
  // static loginUser = catchAsyncError(
  //   async (req: any, res: Response, next: NextFunction) => {
  //     const { walletAddress } = req.body;
  //     const user = await userServices.userByWalletAddress(walletAddress);
  //     if (!user) {
  //       return next(
  //         errorHandler(401, "User with given wallet address not found.")
  //       );
  //     }
  //     const authToken = bs58.encode(nacl.randomBytes(16));
  //     user.set({ authToken });
  //     await user.save();
  //     res.status(200).json({
  //       success: true,
  //       user,
  //       authToken,
  //       message: "User logged in successfully.",
  //     });
  //   }
  // );
  static getTwitterData = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { walletAddress, code } = req.query;

      try {
        const user = await userServices.userByWalletAddress(walletAddress);
        if (!user) {
          return next(
            errorHandler(401, "User with given wallet address not found.")
          );
        }
        const twitterSocial = user.socials.find(
          (social) => social.social == "twitter"
        );
        if (!twitterSocial) {
          return next(errorHandler(401, "Twitter social of user not found."));
        }
        const savedVerfier = twitterSocial.verifier;
        const { accessToken } = await twitterClient.loginWithOAuth2({
          code,
          codeVerifier: savedVerfier,
          redirectUri: `https://${req.get(
            "host"
          )}/user/twitter/callback?walletAddress=${walletAddress}`,
        });
        const userClient = new TwitterApi(accessToken);
        const { data: profile } = await userClient.v2.me({
          "user.fields": [
            "public_metrics",
            "profile_image_url",
            "description",
            "username",
          ],
        });

        // Save Twitter username along with other details
        twitterSocial.followers = profile.public_metrics.followers_count || 0;
        twitterSocial.image = profile.profile_image_url;
        twitterSocial.username = profile.username; // Save the Twitter username
        await user.save();

        // return res.redirect("http://localhost:5173?success=true");
        return res.redirect("https://solanafund.netlify.app?success=true");
      } catch (err: any) {
        console.log("error while getting user data: ", err);
        // res.redirect(
        //   `http://localhost:5173?success=false&error=${err.message}`
        // );
        res.redirect(
          `https://solanafund.netlify.app?success=false&error=${JSON.stringify(
            err
          )}`
        );
      }
    }
  );

  /**
   * Get user's holdings in a specific fund
   */
  static getUserFundHolding = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { fundAddress } = req.params;
      const userId = req.user._id;

      if (!fundAddress) {
        return next(errorHandler(400, "Fund address is required"));
      }

      // Get the fund by address
      const fund = await fundServices.getFundByAddress(fundAddress);
      if (!fund) {
        return next(errorHandler(404, "Fund not found"));
      }

      // Get user's holding in this fund
      const holding = await userHoldingServices.getUserHoldingByFund(
        userId,
        fund._id as string
      );
      if (!holding) {
        return next(
          errorHandler(404, "You don't have any holdings in this fund")
        );
      }

      // Get fund token price and SOL price for USD conversion
      const tokenPrice = await AssetValuationService.calculateFundTokenPrice(
        fund.assets || [],
        fund.fundTokens || "0"
      );

      const tokenAddresses = fund.assets.map((asset) => asset.tokenAddress);
      const latestPrices = await AssetValuationService.getLatestTokenPrices(
        tokenAddresses
      );
      const solPrice = latestPrices[process.env.SOL_TOKEN_ADDRESS || ""];

      // Calculate value in SOL and USD
      const valueInSOL = new BigNumber(holding.fundTokenBalance)
        .multipliedBy(new BigNumber(tokenPrice))
        .toString();

      const valueInUSD = new BigNumber(valueInSOL)
        .multipliedBy(new BigNumber(solPrice || "0"))
        .toString();

      // Calculate profit/loss percentage based on initial investment
      const initialInvestmentInSOL = holding.initialInvestmentAmount;
      const profitLossPercentage = new BigNumber(
        initialInvestmentInSOL
      ).isGreaterThan(0)
        ? new BigNumber(valueInSOL)
            .minus(new BigNumber(initialInvestmentInSOL))
            .dividedBy(new BigNumber(initialInvestmentInSOL))
            .multipliedBy(100)
            .toFixed(2)
        : "0";

      // Get 24-hour price history to calculate daily change
      const { getFundPriceHistory } = await import("../utils/fundUtils");
      const priceHistory = await getFundPriceHistory(
        fund._id.toString(),
        "24h"
      );

      // Calculate 24-hour change percentage
      let dailyChangePercentage = "0";

      if (priceHistory.priceHistory.length > 0) {
        // Get the oldest price point from the last 24 hours
        const oldestPricePoint = priceHistory.priceHistory[0];

        // Calculate what the holding value would have been 24 hours ago
        const oldValueInSOL = new BigNumber(holding.fundTokenBalance)
          .multipliedBy(new BigNumber(oldestPricePoint.price.sol))
          .toString();

        // Calculate percentage change
        if (new BigNumber(oldValueInSOL).isGreaterThan(0)) {
          dailyChangePercentage = new BigNumber(valueInSOL)
            .minus(new BigNumber(oldValueInSOL))
            .dividedBy(new BigNumber(oldValueInSOL))
            .multipliedBy(100)
            .toFixed(2);
        }
      }

      res.status(200).json({
        success: true,
        holding: {
          ...holding.toObject(),
          fundTokenPrice: tokenPrice,
          value: {
            sol: valueInSOL,
            usd: valueInUSD,
          },
          profitLossPercentage,
          dailyChangePercentage,
        },
        fund: {
          name: fund.fundName,
          ticker: fund.fundTicker,
          logo: fund.fundLogoUrl,
        },
      });
    }
  );

  static getTelegramData = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      try {
        console.log("req.body: ", req.body);
        const telegramData = await telegramAuthService.getTelegramUserData(
          req.body
        );

        if (!req.user) {
          return next(errorHandler(401, "User not authenticated"));
        }

        // Update user's social data with Telegram info
        const user = await userModel.findByIdAndUpdate(
          req.user._id,
          {
            $push: {
              socials: {
                social: "telegram",
                username: telegramData.username,
                image: telegramData.photoUrl,
                verifier: "telegram",
              },
            },
          },
          { new: true }
        );

        res.status(200).json({
          success: true,
          message: "Telegram account linked successfully",
          user,
        });
      } catch (error: any) {
        return next(errorHandler(400, error.message));
      }
    }
  );
}

export default userControllers;
