import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import fundServices from "../services/db/fundServices";
import errorHandler from "../helpers/errorHandler";
import userServices from "../services/db/userServices";
import ledgerServices from "../services/db/ledgerServices";
import userHoldingServices from "../services/db/userHoldingServices";
import {
  addBigNumbers,
  subtractBigNumbers,
  validateBigNumberString,
  getPercentage,
  isGreaterOrEqual,
  isLessThan,
  formatDecimal,
} from "../utils/bigNumberUtils";
import {
  ICreateLedgerData,
  IUpdateUserHoldingData,
  LedgerMethod,
} from "../helpers/types/ledgerTypes";
import solanaService from "../services/blockchain/solanaService";
import marketCapService from "../services/price/marketCapService";
import envConfigs from "../configs/envConfigs";
import { Types } from "mongoose";
import { BigNumber } from "bignumber.js";
import AssetValuationService from "../services/price/assetValuationService";
import FundPriceHistoryService from "../services/db/fundPriceHistoryService";
import FundAsset from "../models/fundAssetModel";
import fundAssetHistoryService from "../services/db/fundAssetHistoryService";
import tokenRegistryService from "../services/db/tokenRegistryService";
import telegramGroupService from "../services/telegram/telegramGroupService";
import { IFundDocument } from "../helpers/types/fundTypes";

class ledgerController {
  static createLedger = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { fundAddress, walletAddress, amount, method } = req.body;

      if (!validateBigNumberString(amount)) {
        return next(errorHandler(400, "Invalid amount format"));
      }

      const fund = await fundServices.getFundByAddress(fundAddress);
      if (!fund) {
        return next(errorHandler(400, "Fund with given address not found."));
      }

      const user = await userServices.userByWalletAddress(walletAddress);
      if (!user) {
        return next(
          errorHandler(400, "User with given wallet address not found.")
        );
      }

      // Calculate fee percentage
      const feePercentage = Number(envConfigs.feePercentage);

      // Get SOL price for reference
      const solPrice = await marketCapService.getTokenPrice("SOL");

      // For now, use a placeholder for fund token price
      // For fundraising phase, we use 1:1 ratio with SOL
      let fundTokenPrice = "1";

      if (fund.fundStatus === "trading") {
        try {
          // Calculate fund token price based on assets and supply
          fundTokenPrice = await AssetValuationService.calculateFundTokenPrice(
            fund.assets,
            fund.fundTokens
          );
        } catch (error) {
          console.error("Error calculating fund token price:", error);
          // Continue with default price
        }
      }

      if (method === "buy") {
        // For buy: amount is the SOL amount being invested
        // SOL is the only token accepted for buying fund tokens
        const tokenAddress = envConfigs.solTokenAddress;

        // Calculate fee and fee-deducted amount
        const feeDeductedAmount = getPercentage(
          amount,
          (100 - feePercentage).toString()
        );

        // Create ledger entry for the SOL deposit
        const ledgerData: ICreateLedgerData = {
          fundId: fund._id.toString(),
          userId: user._id.toString(),
          amount: feeDeductedAmount, // Record the SOL amount after fee
          method: "buy",
          tokenAddress, // SOL token address
          tokenSymbol: "SOL",
          price: solPrice, // SOL price
          fundTokenPrice, // Also record fund token price
          fundTokensAmount: feeDeductedAmount, // Also record how many fund tokens were given
        };

        const ledger = await ledgerServices.createLedger(ledgerData);

        // Now update the fund assets after ledger is created
        await fund.updateAsset(
          tokenAddress,
          "SOL",
          feeDeductedAmount,
          "add",
          "buy",
          ledger._id,
          "Ledger"
        );

        // Calculate fund tokens to give to user
        const fundTokensToGive = new BigNumber(feeDeductedAmount)
          .dividedBy(new BigNumber(fundTokenPrice))
          .toString();

        // Update fund's total tokens
        fund.fundTokens = addBigNumbers(
          fund.fundTokens || "0",
          fundTokensToGive
        );

        // Check if fund has met target after this purchase
        if (
          fund.fundStatus === "fundraising" &&
          isGreaterOrEqual(fund.fundTokens, fund.targetRaiseAmount)
        ) {
          fund.fundStatus = "trading";
        }

        await fund.save();

        // Update user holding - give fund tokens to user
        const userHoldingData: IUpdateUserHoldingData = {
          userId: new Types.ObjectId(user._id),
          fundId: fund._id.toString(),
          amount: fundTokensToGive, // User receives fund tokens
          method: "buy",
          tokenAddress: fund.fundTokenAddress, // This is the fund token address
          tokenSymbol: fund.fundTicker,
        };

        const userHolding = await userHoldingServices.updateUserHolding(
          userHoldingData,
          fundTokenPrice
        );

        await FundPriceHistoryService.recordFundPrice(
          fund._id as Types.ObjectId,
          fund.assets,
          fund.fundTokens
        );

        try {
          // Get the fund details
          const fundDetails: IFundDocument = fund;

          if (
            fundDetails &&
            fundDetails?.telegramGroupId &&
            user.socials.find((s) => s.social === "telegram")?.username
          ) {
            // Try to add the user to the Telegram group
            await telegramGroupService.addMemberToGroup(
              fundDetails.telegramGroupId,
              user.socials.find((s) => s.social === "telegram")?.username
            );
            console.log(
              `Added user ${
                user.socials.find((s) => s.social === "telegram")?.username
              } to fund group ${fundDetails.telegramGroupId}`
            );
          }
        } catch (error) {
          // Just log the error but don't fail the transaction
          console.error("Failed to add user to Telegram group:", error);
        }

        res.status(201).json({
          success: true,
          ledger,
          userHolding,
          message: "Fund tokens purchased successfully.",
          fundTokensReceived: fundTokensToGive,
        });
      } else if (method === "sell") {
        if (fund.fundStatus === "fundraising") {
          return next(
            errorHandler(400, "Cannot sell tokens during fundraising period.")
          );
        }

        // For sell: amount is the fund token amount being sold
        // First check if user has enough fund tokens
        const userHolding = await userHoldingServices.getUserHoldingByFund(
          user._id.toString(),
          fund._id.toString()
        );

        if (!userHolding) {
          return next(
            errorHandler(400, "You don't have any holdings in this fund.")
          );
        }

        if (isLessThan(userHolding.fundTokenBalance, amount)) {
          return next(
            errorHandler(
              400,
              `Insufficient fund tokens balance. You have ${userHolding.fundTokenBalance} tokens.`
            )
          );
        }

        // Calculate what percentage of the fund the user is selling
        const percentageSold = new BigNumber(amount)
          .dividedBy(fund.fundTokens)
          .multipliedBy(100)
          .toString();

        // Get all fund assets
        const fundAssets = fund.assets;

        // Track total SOL to be sent to user
        let totalSolToSend = new BigNumber(0);

        // First pass: calculate how much SOL the user will receive
        for (const asset of fundAssets) {
          // Calculate amount to decrease for this asset
          const assetAmountToDecrease = new BigNumber(asset.amount)
            .multipliedBy(percentageSold)
            .toString();

          // If this is SOL, add to the amount to send to user
          if (
            asset.tokenAddress === process.env.SOL_TOKEN_ADDRESS ||
            asset.tokenAddress === "So11111111111111111111111111111111111111112"
          ) {
            totalSolToSend = totalSolToSend.plus(assetAmountToDecrease);
          }
        }

        // No fee calculation - user gets all SOL
        const solToSend = totalSolToSend.toString();

        // Create the ledger entry first
        const ledgerData: ICreateLedgerData = {
          fundId: fund._id.toString(),
          userId: user._id.toString(),
          amount: solToSend,
          method: "sell",
          tokenAddress:
            process.env.SOL_TOKEN_ADDRESS ||
            "So11111111111111111111111111111111111111112",
          tokenSymbol: "SOL",
          price: solPrice,
          fundTokenPrice,
          fundTokensAmount: amount,
        };

        const ledger = await ledgerServices.createLedger(ledgerData);

        // Decrease fund's total token supply
        fund.fundTokens = subtractBigNumbers(fund.fundTokens, amount);

        // Second pass: update all assets and record history
        for (const asset of fundAssets) {
          // Calculate amount to decrease for this asset
          const assetAmountToDecrease = new BigNumber(asset.amount)
            .multipliedBy(percentageSold)
            .dividedBy(100) // Divide by 100 since we multiplied by 100 earlier
            .toString();

          // Update the asset quantity
          const newQuantity = subtractBigNumbers(
            asset.amount,
            assetAmountToDecrease
          );

          // Save the updated asset in the database
          try {
            // Also update the asset in the fund.assets array
            if (fund.assets && Array.isArray(fund.assets)) {
              const fundAssetIndex = fund.assets.findIndex(
                (a) => a.tokenAddress === asset.tokenAddress
              );

              if (fundAssetIndex !== -1) {
                fund.assets[fundAssetIndex].amount = newQuantity;
              }
            }
          } catch (error) {
            console.error(`Error updating asset ${asset.tokenSymbol}:`, error);
          }

          // Record asset history with the ledger ID
          await fundAssetHistoryService.createAssetHistory({
            fundId: fund._id as Types.ObjectId,
            tokenAddress: asset.tokenAddress,
            tokenSymbol: asset.tokenSymbol,
            amountBefore: asset.amount,
            amountAfter: newQuantity,
            tokenPrice:
              (await tokenRegistryService.getTokenPrice(asset.tokenAddress)) ||
              "0",
            operationType: "sell",
            relatedTransactionId: ledger._id,
            transactionType: "Ledger",
          });
        }

        // Save the updated fund with updated assets array
        await fund.save();

        // Record updated fund price history
        await FundPriceHistoryService.recordFundPrice(
          fund._id as Types.ObjectId,
          await FundAsset.find({ fundId: fund._id }),
          fund.fundTokens
        );

        // Update user holding - remove fund tokens from user
        const userHoldingData: IUpdateUserHoldingData = {
          userId: new Types.ObjectId(user._id),
          fundId: fund._id.toString(),
          amount, // Amount of fund tokens to sell
          method: "sell",
          tokenAddress: fund.fundTokenAddress,
          tokenSymbol: fund.fundTicker,
        };

        const updatedUserHolding = await userHoldingServices.updateUserHolding(
          userHoldingData,
          fundTokenPrice
        );

        res.status(201).json({
          success: true,
          ledger,
          userHolding: updatedUserHolding,
          message: "Fund tokens sold successfully.",
          solReceived: solToSend,
        });
      }
    }
  );

  static getLedgerByFund = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page, limit } = req.query;
      const { fundAddress } = req.params;
      const fund = await fundServices.getFundByAddress(fundAddress);
      const { ledgers, ledgersCount } = await ledgerServices.getLedgerByFund(
        fund._id.toString(),
        Number(page),
        Number(limit)
      );
      res.status(200).json({
        success: true,
        ledgers,
        ledgersCount,
      });
    }
  );
}

export default ledgerController;
