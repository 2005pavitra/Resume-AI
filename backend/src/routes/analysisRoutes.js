import express from "express";
import { protect } from "../middleware/protect.js";
import {
    createAnalysis,
    getAnalysis,
    listAnalyses,
    customizeAnalysis,
    evaluateMockInterview,
} from "../controllers/analysisController.js";

const router = express.Router();

router.use(protect);
router.get("/", listAnalyses);
router.get("/:id", getAnalysis);
router.post("/", createAnalysis);
router.put("/:id/customize", customizeAnalysis);
router.post("/:id/mock-interview/evaluate", evaluateMockInterview);

export default router;


