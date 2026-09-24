import express from "express";
import { protect } from "../middleware/protect.js";
import uploadPdf from "../middleware/uploadPdf.js";
import {
    createJobDescription,
    listJobDescriptions,
    uploadJobDescription,
} from "../controllers/jobDescriptionController.js";

const router = express.Router();

router.use(protect);
router.get("/", listJobDescriptions);
router.post("/", createJobDescription);
router.post("/upload", uploadPdf.single("jobDescription"), uploadJobDescription);

export default router;
