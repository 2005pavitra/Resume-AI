import crypto from "crypto";
import JobDescription from "../models/JobDescription.js";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { parseJobDescriptionText } from "../services/jobDescriptionParser.js";
import { publishEvent } from "../config/kafka.js";

export const computeHash = (text) => crypto.createHash("sha256").update((text || "").trim().toLowerCase().replace(/\s+/g, " ")).digest("hex");

export const createJobDescription = async (req, res) => {
    try {
        const { title, company, sourceUrl, rawText, parsedRequirements } = req.body;

        if (!title || !rawText) {
            return res.status(400).json({
                success: false,
                message: "Job title and description text are required",
            });
        }

        const contentHash = computeHash(rawText);
        const normalizedTitle = title.trim();
        const normalizedCompany = (company || "").trim();

        let jobDescription = await JobDescription.findOne({
            user: req.user._id,
            $or: [
                { contentHash },
                {
                    title: new RegExp(`^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                    company: normalizedCompany ? new RegExp(`^${normalizedCompany.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : undefined,
                },
            ].filter(Boolean),
        });

        if (jobDescription) {
            jobDescription.rawText = rawText;
            jobDescription.contentHash = contentHash;
            jobDescription.title = title;
            if (company) jobDescription.company = company;
            if (sourceUrl) jobDescription.sourceUrl = sourceUrl;
            jobDescription.parsedRequirements = parsedRequirements || parseJobDescriptionText(rawText);
            await jobDescription.save();

            return res.status(200).json({
                success: true,
                jobDescription,
                deduplicated: true,
            });
        }

        jobDescription = await JobDescription.create({
            user: req.user._id,
            title,
            company,
            sourceUrl,
            rawText,
            contentHash,
            parsedRequirements: parsedRequirements || parseJobDescriptionText(rawText),
        });

        void publishEvent("job-description.ingested", {
            entityId: jobDescription._id,
            userId: req.user._id,
            jobDescriptionId: jobDescription._id,
            source: "text",
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

        const contentHash = computeHash(rawText);
        const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, "");
        const company = req.body.company;

        let jobDescription = await JobDescription.findOne({
            user: req.user._id,
            $or: [
                { contentHash },
                {
                    title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                    company: company ? new RegExp(`^${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : undefined,
                },
            ].filter(Boolean),
        });

        if (jobDescription) {
            jobDescription.rawText = rawText;
            jobDescription.contentHash = contentHash;
            jobDescription.title = title;
            if (company) jobDescription.company = company;
            if (req.body.sourceUrl) jobDescription.sourceUrl = req.body.sourceUrl;
            jobDescription.parsedRequirements = parseJobDescriptionText(rawText);
            await jobDescription.save();

            return res.status(200).json({
                success: true,
                jobDescription,
                deduplicated: true,
            });
        }

        const parsedRequirements = parseJobDescriptionText(rawText);
        jobDescription = await JobDescription.create({
            user: req.user._id,
            title,
            company,
            sourceUrl: req.body.sourceUrl,
            rawText,
            contentHash,
            parsedRequirements,
        });

        void publishEvent("job-description.ingested", {
            entityId: jobDescription._id,
            userId: req.user._id,
            jobDescriptionId: jobDescription._id,
            source: "pdf",
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

