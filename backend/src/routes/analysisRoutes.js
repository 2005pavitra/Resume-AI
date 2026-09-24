import express from "express";
import { protect } from "../middleware/protect.js";
import { createAnalysis, listAnalyses } from "../controllers/analysisController.js";

const router = express.Router();

router.use(protect);
router.get("/", listAnalyses);
router.post("/", createAnalysis);

export default router;
