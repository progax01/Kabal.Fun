import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import fundAssetHistoryService from "../services/db/fundAssetHistoryService";

class FundAssetController {
  /**
   * Get asset history for a fund
   */
  static getAssetHistory = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { page = 1, limit = 20 } = req.query;
      const fund = req.fund;
      
      const result = await fundAssetHistoryService.getAssetHistoryByFund(
        fund._id,
        Number(page),
        Number(limit)
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    }
  );
  
  /**
   * Get asset history for a specific token in a fund
   */
  static getTokenAssetHistory = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { tokenAddress } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const fund = req.fund;
      
      if (!tokenAddress) {
        return next(errorHandler(400, "Token address is required"));
      }
      
      const result = await fundAssetHistoryService.getAssetHistoryByToken(
        fund._id,
        tokenAddress,
        Number(page),
        Number(limit)
      );
      
      res.status(200).json({
        success: true,
        ...result
      });
    }
  );
  
  /**
   * Get asset performance for a specific token in a fund
   */
  static getAssetPerformance = catchAsyncError(
    async (req: any, res: Response, next: NextFunction) => {
      const { tokenAddress } = req.params;
      const { startDate, endDate } = req.query;
      const fund = req.fund;
      
      if (!tokenAddress) {
        return next(errorHandler(400, "Token address is required"));
      }
      
      if (!startDate) {
        return next(errorHandler(400, "Start date is required"));
      }
      
      const performance = await fundAssetHistoryService.getAssetPerformance(
        fund._id,
        tokenAddress,
        new Date(startDate as string),
        endDate ? new Date(endDate as string) : new Date()
      );
      
      res.status(200).json({
        success: true,
        performance
      });
    }
  );
}

export default FundAssetController; 