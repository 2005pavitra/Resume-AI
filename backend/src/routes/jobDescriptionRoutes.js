import express from "express";
import { protect } from "../middleware/protect.js";
import {
    createJobDescription,
    listJobDescriptions,
} from "../controllers/jobDescriptionController.js";

const router = express.Router();

router.use(protect);
router.get("/", listJobDescriptions);
router.post("/", createJobDescription);

export default router;
