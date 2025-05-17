import { Router } from "express";
import ledgerController from "../controllers/ledgerController";
import authenticateUser from "../middlewares/auth";
const ledgerRouter = Router();

ledgerRouter.post("/new", authenticateUser, ledgerController.createLedger);
ledgerRouter.get("/fund/:fundAddress", ledgerController.getLedgerByFund);

export default ledgerRouter;
