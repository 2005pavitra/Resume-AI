import crypto from "crypto";
import Resume from "../models/Resume.js";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { parseResumeText } from "../services/resumeParser.js";
import { publishEvent } from "../config/kafka.js";

export const computeHash = (text) => crypto.createHash("sha256").update((text || "").trim().toLowerCase().replace(/\s+/g, " ")).digest("hex");

export const createResume = async (req, res) => {
    try {
        const { title, rawText, fileName, fileUrl, parsedProfile } = req.body;

        if (!title || !rawText) {
            return res.status(400).json({
                success: false,
                message: "Resume title and text are required",
            });
        }

        const contentHash = computeHash(rawText);

        let resume = await Resume.findOne({
            user: req.user._id,
            $or: [{ contentHash }, { title: title.trim() }],
        });

        if (resume) {
            resume.rawText = rawText;
            resume.contentHash = contentHash;
            resume.parsedProfile = parsedProfile || resume.parsedProfile;
            if (fileName) resume.fileName = fileName;
            if (fileUrl) resume.fileUrl = fileUrl;
            resume.version = (resume.version || 1) + 1;
            resume.status = "ready";
            await resume.save();

            return res.status(200).json({
                success: true,
                resume,
                deduplicated: true,
            });
        }

        resume = await Resume.create({
            user: req.user._id,
            title,
            rawText,
            fileName,
            fileUrl,
            parsedProfile,
            contentHash,
            status: parsedProfile ? "ready" : "uploaded",
        });

        void publishEvent("resume.ingested", {
            entityId: resume._id,
            userId: req.user._id,
            resumeId: resume._id,
            source: "text",
        });

        return res.status(201).json({
            success: true,
            resume,
        });
    } catch (error) {
        console.error("Create resume error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while saving resume",
        });
    }
};

export const listResumes = async (req, res) => {
    try {
        const resumes = await Resume.find({ user: req.user._id })
            .select("title fileName version status createdAt updatedAt")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            resumes,
        });
    } catch (error) {
        console.error("List resumes error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while loading resumes",
        });
    }
};

export const uploadResume = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "A PDF resume file is required",
        });
    }

    try {
        const parsedPdf = await pdfParse(req.file.buffer);
        const rawText = parsedPdf.text.trim();

        if (!rawText) {
            return res.status(422).json({
                success: false,
                message: "The PDF does not contain readable text",
            });
        }

        const contentHash = computeHash(rawText);
        const parsedProfile = parseResumeText(rawText);

        let resume = await Resume.findOne({
            user: req.user._id,
            $or: [{ contentHash }, { fileName: req.file.originalname }],
        });

        if (resume) {
            resume.rawText = rawText;
            resume.contentHash = contentHash;
            resume.parsedProfile = parsedProfile;
            resume.title = req.body.title || resume.title || req.file.originalname.replace(/\.pdf$/i, "");
            resume.fileName = req.file.originalname;
            resume.version = (resume.version || 1) + 1;
            resume.status = "ready";
            await resume.save();

            return res.status(200).json({
                success: true,
                resume,
                deduplicated: true,
            });
        }

        resume = await Resume.create({
            user: req.user._id,
            title: req.body.title || req.file.originalname.replace(/\.pdf$/i, ""),
            fileName: req.file.originalname,
            rawText,
            parsedProfile,
            contentHash,
            status: "ready",
        });

        void publishEvent("resume.ingested", {
            entityId: resume._id,
            userId: req.user._id,
            resumeId: resume._id,
            source: "pdf",
        });

        return res.status(201).json({
            success: true,
            resume,
        });
    } catch (error) {
        console.error("Upload resume error:", error);
        return res.status(422).json({
            success: false,
            message: "Unable to parse the PDF resume",
        });
    }
};

