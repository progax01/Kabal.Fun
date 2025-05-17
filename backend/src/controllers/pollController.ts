import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import pollServices from "../services/db/pollServices";
import telegramGroupService from "../services/telegram/telegramGroupService";
import fundServices from "../services/db/fundServices";

class PollController {
  static createPoll = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        fundId,
        question,
        options,
        isAnonymous,
        allowsMultipleAnswers,
        closeAfterMinutes,
      } = req.body;

      // Validate inputs
      if (!fundId || !question || !options || !Array.isArray(options)) {
        return next(errorHandler(400, "Missing required fields"));
      }

      // Get the fund to check if it exists and get the group ID
      const fund = await fundServices.getFundById(fundId as string);
      if (!fund) {
        return next(errorHandler(404, "Fund not found"));
      }

      if (!fund.telegramGroupId) {
        return next(errorHandler(400, "Fund does not have a Telegram group"));
      }

      // Create the poll in Telegram
      const pollResult = await telegramGroupService.createPollInGroup(
        fundId,
        fund.telegramGroupId,
        question,
        options,
        isAnonymous || true,
        allowsMultipleAnswers || false,
        closeAfterMinutes || 0
      );

      res.status(201).json({
        success: true,
        message: "Poll created successfully",
        poll: pollResult,
      });
    }
  );

  static getPollsByFundId = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { fundId } = req.params;

      const polls = await pollServices.getPollsByFundId(fundId);

      res.status(200).json({
        success: true,
        polls,
      });
    }
  );

  static getPollsByFundAddress = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { fundAddress } = req.params;

      const polls = await pollServices.getPollsByFundAddress(fundAddress);

      res.status(200).json({
        success: true,
        polls,
      });
    }
  );

  static getPollById = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { pollId } = req.params;

      const poll = await pollServices.getPollById(pollId);
      if (!poll) {
        return next(errorHandler(404, "Poll not found"));
      }

      res.status(200).json({
        success: true,
        poll,
      });
    }
  );
}

export default PollController;
