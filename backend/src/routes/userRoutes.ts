import { NextFunction, Router } from "express";
import userController from "../controllers/userController";
import authenticateUser from "../middlewares/auth";
import { Response, Request } from "express";
import { getTwitterAuthLink } from "../middlewares/twitterAuth";

const userRouter = Router();

userRouter.post("/login", userController.loginUser);
userRouter.get("/twitter/auth/link", authenticateUser, getTwitterAuthLink);
userRouter.get("/twitter/callback", userController.getTwitterData);
userRouter.get(
  "/holding/fund/:fundAddress",
  authenticateUser,
  userController.getUserFundHolding
);
userRouter.post(
  "/telegram/auth",
  authenticateUser,
  userController.getTelegramData
);
export default userRouter;
