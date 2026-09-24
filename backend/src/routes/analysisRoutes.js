import express from "express";
import { protect } from "../middleware/protect.js";
import { createAnalysis, getAnalysis, listAnalyses } from "../controllers/analysisController.js";

const router = express.Router();

router.use(protect);
router.get("/", listAnalyses);
router.get("/:id", getAnalysis);
router.post("/", createAnalysis);

export default router;
