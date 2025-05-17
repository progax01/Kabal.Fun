import { Router } from "express";
import FundAssetController from "../controllers/fundAssetController";
import authenticateUser from "../middlewares/auth";
import isManager from "../middlewares/isManager";

const fundAssetRouter = Router();

// All routes require authentication and manager authorization
fundAssetRouter.get(
  "/fund/:fundAddress/history", 
  authenticateUser, 
  isManager, 
  FundAssetController.getAssetHistory
);

fundAssetRouter.get(
  "/fund/:fundAddress/token/:tokenAddress/history", 
  authenticateUser, 
  isManager, 
  FundAssetController.getTokenAssetHistory
);

fundAssetRouter.get(
  "/fund/:fundAddress/token/:tokenAddress/performance", 
  authenticateUser, 
  isManager, 
  FundAssetController.getAssetPerformance
);

export default fundAssetRouter; 