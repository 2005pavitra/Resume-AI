import express from "express";
import { protect } from "../middleware/protect.js";
import uploadPdf from "../middleware/uploadPdf.js";
import { createResume, listResumes, uploadResume } from "../controllers/resumeController.js";

const router = express.Router();

router.use(protect);
router.get("/", listResumes);
router.post("/", createResume);
router.post("/upload", uploadPdf.single("resume"), uploadResume);

export default router;
