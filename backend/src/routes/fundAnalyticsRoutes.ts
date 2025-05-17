import { Router } from "express";
import FundAnalyticsController from "../controllers/fundAnalyticsController";
import authenticateUser from "../middlewares/auth";
import isManager from "../middlewares/isManager";

const fundAnalyticsRouter = Router();

// Route for fund performance data
fundAnalyticsRouter.get(
  "/fund/:fundAddress/performance", 
  FundAnalyticsController.getFundPerformanceData
);

export default fundAnalyticsRouter; 