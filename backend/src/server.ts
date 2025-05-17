import express, { Request, Response, NextFunction } from "express";
import envConfigs from "./configs/envConfigs";
import dbConfig from "./configs/connectDb";
import userRouter from "./routes/userRoutes";
import path from "path";
import fundRouter from "./routes/fundRoutes";
import cors from "cors";
import ledgerRouter from "./routes/ledgerRoutes";
import managerRouter from "./routes/managerRoutes";
import fs from "fs";
import { SchedulerService } from "./services/schedulerService";
import tradeRouter from "./routes/tradeRoutes";
import tokenDecimalsService from "./services/price/tokenDecimalsService";
import tokenRegistryService from "./services/db/tokenRegistryService";
import tokenPriceWorker from "./services/price/tokenPriceWorker";
import tokenRouter from "./routes/tokenRoutes";
import fundAssetRouter from "./routes/fundAssetRoutes";
import fundAnalyticsRouter from "./routes/fundAnalyticsRoutes";
import commentRouter from "./routes/commentRoutes";
import pollRouter from "./routes/pollRoutes";
import telegramGroupService from "./services/telegram/telegramGroupService";

dbConfig.connectDb();

const app = express();
app.use(cors());

// Remove size limits from json and urlencoded parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Get the correct path for fundImages
const getFundImagesPath = () => {
  // Always use the src/fundImages directory at project root

  const uploadPath = path.join(__dirname, "../../src/fundImages");

  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  console.log("Static serve path:", uploadPath);
  return uploadPath;
};
telegramGroupService.setupBotCommands();

app.use("/uploads", express.static(getFundImagesPath()));

app.use("/user", userRouter);
app.use("/fund", fundRouter);
app.use("/ledger", ledgerRouter);
app.use("/manager", managerRouter);
app.use("/trade", tradeRouter);
app.use("/token", tokenRouter);
app.use("/asset", fundAssetRouter);
app.use("/analytics", fundAnalyticsRouter);
app.use("/comment", commentRouter);
app.use("/poll", pollRouter);
// Initialize scheduled tasks
SchedulerService.initializeScheduledTasks();

// Preload common token decimals
tokenDecimalsService.preloadCommonTokens();

// Initialize token registry and price worker
(async () => {
  await tokenRegistryService.initialize();

  // Register default tokens (SOL)
  await tokenRegistryService.registerToken(
    "So11111111111111111111111111111111111111112",
    "SOL",
    9,
    "Solana",
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    "solana"
  );

  // Start price worker with 5-minute interval
  tokenPriceWorker.start(2 * 60 * 1000);
})();

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    message,
  });
});

app.listen(envConfigs.port, () => {
  console.log("Server is running on port: ", envConfigs.port);
});
