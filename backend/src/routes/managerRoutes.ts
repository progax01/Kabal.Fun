import {Router} from "express";
import ManagerController from "../controllers/managerController";
import authenticateUser from "../middlewares/auth";
import isManager from "../middlewares/isManager";


const managerRouter = Router()

// Get all funds managed by the authenticated user
managerRouter.get("/funds", authenticateUser, ManagerController.getManagerFunds);

// Routes that require manager authentication
managerRouter.get("/fund/:fundAddress/details", authenticateUser, isManager, ManagerController.getFundDetails);

// Get fund portfolio with detailed metrics
managerRouter.get(
  "/fund/:fundAddress/portfolio", 
  authenticateUser, 
  isManager, 
  ManagerController.getFundPortfolio
);

export default managerRouter;