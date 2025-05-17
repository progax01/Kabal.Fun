import { Router } from "express";
import multerUpload from "../configs/multer";
import fundController from "../controllers/fundController";

const fundRouter = Router();

fundRouter.post("/new", multerUpload.single("logo"), fundController.createFund);
fundRouter.get(
  "/generate/uniqueid/:walletAddress",
  fundController.createFundUniqueId
);
fundRouter.get("/list", fundController.getFunds);
fundRouter.get("/list/all", fundController.getAllFunds);
fundRouter.get("/search/:name", fundController.getFundByName);
fundRouter.get("/details/:address", fundController.getFundByAddress);
fundRouter.get("/most-gaining", fundController.getMostGainingFund);
fundRouter.get("/leaderboard", fundController.getFundLeaderboard);
fundRouter.post("/sell-quote", fundController.getSellQuote);
export default fundRouter;
