import mongoose from "mongoose";
import AnalysisReport from "../models/AnalysisReport.js";
import JobDescription from "../models/JobDescription.js";
import Resume from "../models/Resume.js";
import { compareResumeToJob } from "../services/analysisService.js";

const findOwnedDocument = async (Model, id, userId) => Model.findOne({ _id: id, user: userId });

export const createAnalysis = async (req, res) => {
    const { resumeId, jobDescriptionId } = req.body;

    if (!mongoose.isValidObjectId(resumeId) || !mongoose.isValidObjectId(jobDescriptionId)) {
        return res.status(400).json({
            success: false,
            message: "Valid resumeId and jobDescriptionId are required",
        });
    }

    try {
        const [resume, jobDescription] = await Promise.all([
            findOwnedDocument(Resume, resumeId, req.user._id),
            findOwnedDocument(JobDescription, jobDescriptionId, req.user._id),
        ]);

        if (!resume || !jobDescription) {
            return res.status(404).json({
                success: false,
                message: "Resume or job description not found",
            });
        }

        const comparison = compareResumeToJob(resume, jobDescription);
        const report = await AnalysisReport.create({
            user: req.user._id,
            resume: resume._id,
            jobDescription: jobDescription._id,
            ...comparison,
            status: "complete",
            generatedAt: new Date(),
        });

        return res.status(201).json({
            success: true,
            report,
        });
    } catch (error) {
        console.error("Create analysis error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while comparing resume and job description",
        });
    }
};

export const listAnalyses = async (req, res) => {
    try {
        const reports = await AnalysisReport.find({ user: req.user._id })
            .populate("resume", "title")
            .populate("jobDescription", "title company")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            reports,
        });
    } catch (error) {
        console.error("List analyses error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while loading analysis reports",
        });
    }
};
