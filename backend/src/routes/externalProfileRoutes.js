import express from "express";
import { protect } from "../middleware/protect.js";
import { listProfiles, syncProfile } from "../controllers/externalProfileController.js";

const router = express.Router();

router.use(protect);
router.get("/", listProfiles);
router.post("/:provider/sync", syncProfile);

export default router;
