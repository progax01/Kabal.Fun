import express from "express";
import pollController from "../controllers/pollController";

const router = express.Router();

// Get polls for a fund
router.get("/fund/:fundId", pollController.getPollsByFundId);

// Get polls for a fund by address
router.get("/fund/address/:fundAddress", pollController.getPollsByFundAddress);

// Get a specific poll
router.get("/:pollId", pollController.getPollById);

// Create a new poll
router.post("/create", pollController.createPoll);

export default router;
