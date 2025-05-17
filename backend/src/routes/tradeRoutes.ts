import { Router } from "express";
import TradeController from "../controllers/tradeController";
import authenticateUser from "../middlewares/auth";
import isManager from "../middlewares/isManager";

const tradeRouter = Router();

// All trade routes require authentication and manager authorization
tradeRouter.post(
  "/fund/:fundAddress/execute", 
  authenticateUser, 
  isManager, 
  TradeController.executeTrade
);

tradeRouter.get(
  "/fund/:fundAddress/history", 
  authenticateUser, 
  isManager, 
  TradeController.getTradeHistory
);

tradeRouter.get(
  "/market/prices", 
  authenticateUser, 
  TradeController.getMarketPrices
);

tradeRouter.get(
  "/manager/trades", 
  authenticateUser, 
  TradeController.getManagerTrades
);

export default tradeRouter; 