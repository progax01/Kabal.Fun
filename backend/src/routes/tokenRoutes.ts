import { Router } from "express";
import TokenController from "../controllers/tokenController";
import authenticateUser from "../middlewares/auth";

const tokenRouter = Router();

// Public routes
tokenRouter.get("/list", TokenController.getAllTokens);
tokenRouter.get("/jupiter", TokenController.getJupiterTokens);

// Authenticated routes
tokenRouter.get(
  "/:address", 
  authenticateUser, 
  TokenController.getTokenByAddress
);

tokenRouter.get(
  "/:address/history", 
  authenticateUser, 
  TokenController.getTokenPriceHistory
);

tokenRouter.get(
  "/:address/change", 
  authenticateUser, 
  TokenController.getTokenPriceChange
);

export default tokenRouter; 