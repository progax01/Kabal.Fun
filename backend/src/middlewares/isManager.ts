import { Request, Response, NextFunction } from "express";
import errorHandler from "../helpers/errorHandler";
import fundServices from "../services/db/fundServices";

/**
 * Middleware to verify if the authenticated user is the manager of the specified fund
 * Requires user to be authenticated via auth.ts middleware
 * Requires fundAddress in route params
 */
const isManager = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { fundAddress } = req.params;
    
    // Check if user is authenticated
    if (!req.user) {
      return next(errorHandler(401, "Authentication required"));
    }
    
    if (!fundAddress) {
      return next(errorHandler(400, "Fund address is required"));
    }
    
    // Get fund by address
    const fund = await fundServices.getFundByAddress(fundAddress);
    if (!fund) {
      return next(errorHandler(404, "Fund not found"));
    }
    
    // Check if authenticated user is the fund manager
    if (fund.managerId.toString() !== req.user._id.toString()) {
      return next(errorHandler(403, "You are not authorized to access this fund's data"));
    }
    
    // Add fund to request for use in controller
    req.fund = fund;
    
    next();
  } catch (error: any) {
    return next(errorHandler(500, error.message));
  }
};

export default isManager; 