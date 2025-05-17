import { TwitterApi } from "twitter-api-v2";
import envConfigs from "../configs/envConfigs";
import { Request, Response, NextFunction } from "express";
import catchAsyncError from "./catchAsyncError";
import userServices from "../services/db/userServices";
import axios from "axios";
import qs from "qs";

const client = new TwitterApi({
  clientId: envConfigs.twitterClientId,
  clientSecret: envConfigs.twitterClientSecret,
});

export const getTwitterAuthLink = catchAsyncError(
  async (req: any, res: Response, next: NextFunction) => {
    const walletAddress = req.user.walletAddress;

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      `https://${req.get(
        "host"
      )}/user/twitter/callback?walletAddress=${walletAddress}`,
      {
        scope: ["tweet.read", "users.read", "follows.read"],
      }
    );
    const user = await userServices.userByWalletAddress(walletAddress);

    const userSocial = user.socials.find(
      (social) => social.social == "twitter"
    );
    if (userSocial) {
      userSocial.verifier = codeVerifier;
    } else {
      user.socials.push({
        social: "twitter",
        verifier: codeVerifier,
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      url,
    });
  }
);
