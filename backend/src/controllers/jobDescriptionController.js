import JobDescription from "../models/JobDescription.js";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { parseJobDescriptionText } from "../services/jobDescriptionParser.js";

export const createJobDescription = async (req, res) => {
    try {
        const { title, company, sourceUrl, rawText, parsedRequirements } = req.body;

        if (!title || !rawText) {
            return res.status(400).json({
                success: false,
                message: "Job title and description text are required",
            });
        }

        const jobDescription = await JobDescription.create({
            user: req.user._id,
            title,
            company,
            sourceUrl,
            rawText,
            parsedRequirements: parsedRequirements || parseJobDescriptionText(rawText),
        });

        return res.status(201).json({
            success: true,
            jobDescription,
        });
    } catch (error) {
        console.error("Create job description error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while saving job description",
        });
    }
};

export const listJobDescriptions = async (req, res) => {
    try {
        const jobDescriptions = await JobDescription.find({ user: req.user._id })
            .select("title company sourceUrl createdAt updatedAt")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            jobDescriptions,
        });
    } catch (error) {
        console.error("List job descriptions error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while loading job descriptions",
        });
    }
};

export const uploadJobDescription = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "A PDF job description file is required",
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

        const parsedRequirements = parseJobDescriptionText(rawText);
        const jobDescription = await JobDescription.create({
            user: req.user._id,
            title: req.body.title || req.file.originalname.replace(/\.pdf$/i, ""),
            company: req.body.company,
            sourceUrl: req.body.sourceUrl,
            rawText,
            parsedRequirements,
        });

        return res.status(201).json({
            success: true,
            jobDescription,
        });
    } catch (error) {
        console.error("Upload job description error:", error);
        return res.status(422).json({
            success: false,
            message: "Unable to parse the PDF job description",
        });
    }
};
