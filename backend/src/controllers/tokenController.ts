import { Request, Response, NextFunction } from "express";
import catchAsyncError from "../middlewares/catchAsyncError";
import errorHandler from "../helpers/errorHandler";
import tokenRegistryService from "../services/db/tokenRegistryService";
import jupiterService from "../services/blockchain/jupiterService";

class TokenController {
  /**
   * Get all registered tokens
   */
  static getAllTokens = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const tokens = await tokenRegistryService.getAllTokens();
      
      res.status(200).json({
        success: true,
        tokens: tokens.map(token => ({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          lastPrice: token.lastPrice,
          lastUpdated: token.lastUpdated
        }))
      });
    }
  );
  
  /**
   * Get token details by address
   */
  static getTokenByAddress = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { address } = req.params;
      
      if (!address) {
        return next(errorHandler(400, "Token address is required"));
      }
      
      const token = await tokenRegistryService.getTokenByAddress(address);
      
      if (!token) {
        return next(errorHandler(404, "Token not found"));
      }
      
      res.status(200).json({
        success: true,
        token: {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          lastPrice: token.lastPrice,
          lastUpdated: token.lastUpdated
        }
      });
    }
  );
  
  /**
   * Get token price history
   */
  static getTokenPriceHistory = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { address } = req.params;
      const { startDate, endDate, limit } = req.query;
      
      if (!address) {
        return next(errorHandler(400, "Token address is required"));
      }
      
      const token = await tokenRegistryService.getTokenByAddress(address);
      
      if (!token) {
        return next(errorHandler(404, "Token not found"));
      }
      
      const priceHistory = await tokenRegistryService.getTokenPriceHistory(
        address,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        limit ? parseInt(limit as string) : 100
      );
      
      res.status(200).json({
        success: true,
        token: {
          address: token.address,
          symbol: token.symbol,
          name: token.name
        },
        priceHistory
      });
    }
  );
  
  /**
   * Get token price change over a period
   */
  static getTokenPriceChange = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const { address } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!address) {
        return next(errorHandler(400, "Token address is required"));
      }
      
      if (!startDate) {
        return next(errorHandler(400, "Start date is required"));
      }
      
      const token = await tokenRegistryService.getTokenByAddress(address);
      
      if (!token) {
        return next(errorHandler(404, "Token not found"));
      }
      
      const priceChange = await tokenRegistryService.getTokenPriceChange(
        address,
        new Date(startDate as string),
        endDate ? new Date(endDate as string) : new Date()
      );
      
      res.status(200).json({
        success: true,
        token: {
          address: token.address,
          symbol: token.symbol,
          name: token.name
        },
        priceChange
      });
    }
  );
  
  /**
   * Get supported tokens from Jupiter
   */
  static getJupiterTokens = catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const jupiterTokens = await jupiterService.getSupportedTokens();
      
      res.status(200).json({
        success: true,
        tokens: jupiterTokens
      });
    }
  );
}

export default TokenController; 