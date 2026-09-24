import express from "express";
import { protect } from "../middleware/protect.js";
import { createResume, listResumes } from "../controllers/resumeController.js";

const router = express.Router();

router.use(protect);
router.get("/", listResumes);
router.post("/", createResume);

export default router;
