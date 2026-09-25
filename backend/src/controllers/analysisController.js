import mongoose from "mongoose";
import AnalysisReport from "../models/AnalysisReport.js";
import JobDescription from "../models/JobDescription.js";
import Resume from "../models/Resume.js";
import ExternalProfile from "../models/ExternalProfile.js";
import { compareResumeToJob } from "../services/analysisService.js";
import { generateAiInsights, evaluateMockInterviewAnswer } from "../services/llmService.js";
import { publishEvent } from "../config/kafka.js";
import { getRedisClient } from "../config/redis.js";

const findOwnedDocument = async (Model, id, userId) => Model.findOne({ _id: id, user: userId });

const cacheGet = async (key) => {
    try {
        const client = await getRedisClient();
        if (!client) return null;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

const cacheSet = async (key, data, ttlSeconds = 3600) => {
    try {
        const client = await getRedisClient();
        if (!client) return;
        await client.setEx(key, ttlSeconds, JSON.stringify(data));
    } catch {
        // graceful ignore if redis offline
    }
};

export const createAnalysis = async (req, res) => {
    const { resumeId, jobDescriptionId, days, targetType } = req.body;

    if (!mongoose.isValidObjectId(resumeId) || !mongoose.isValidObjectId(jobDescriptionId)) {
        return res.status(400).json({
            success: false,
            message: "Valid resumeId and jobDescriptionId are required",
        });
    }

    try {
        const [resume, jobDescription, externalProfiles] = await Promise.all([
            findOwnedDocument(Resume, resumeId, req.user._id),
            findOwnedDocument(JobDescription, jobDescriptionId, req.user._id),
            ExternalProfile.find({ user: req.user._id, syncStatus: "ready" }),
        ]);

        if (!resume || !jobDescription) {
            return res.status(404).json({
                success: false,
                message: "Resume or job description not found",
            });
        }

        const planDays = typeof days === "number" && days >= 1 && days <= 60 ? days : 14;
        const mode = ["comprehensive", "oa", "technical"].includes(targetType) ? targetType : "comprehensive";
        const comparison = compareResumeToJob(resume, jobDescription, externalProfiles, { days: planDays, targetType: mode });
        const aiInsights = await generateAiInsights(resume, jobDescription, comparison);

        // Check if an analysis report for this user, resume, and JD already exists
        let report = await AnalysisReport.findOne({
            user: req.user._id,
            resume: resume._id,
            jobDescription: jobDescription._id,
        });

        const isExisting = Boolean(report);

        if (report) {
            Object.assign(report, comparison);
            if (aiInsights) report.aiInsights = aiInsights;
            report.targetType = mode;
            report.customDays = planDays;
            report.status = "complete";
            report.generatedAt = new Date();
            await report.save();
        } else {
            report = await AnalysisReport.create({
                user: req.user._id,
                resume: resume._id,
                jobDescription: jobDescription._id,
                ...comparison,
                targetType: mode,
                customDays: planDays,
                aiInsights: aiInsights || undefined,
                status: "complete",
                generatedAt: new Date(),
            });
        }

        const populatedReport = await AnalysisReport.findById(report._id)
            .populate("resume", "title version")
            .populate("jobDescription", "title company");

        void cacheSet(`analysis:${report._id}`, populatedReport);

        void publishEvent("analysis.completed", {
            entityId: report._id,
            userId: req.user._id,
            reportId: report._id,
            resumeId: resume._id,
            jobDescriptionId: jobDescription._id,
        });

        return res.status(isExisting ? 200 : 201).json({
            success: true,
            report: populatedReport,
            deduplicated: isExisting,
        });
    } catch (error) {
        console.error("Create analysis error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while comparing resume and job description",
        });
    }
};

export const customizeAnalysis = async (req, res) => {
    const { id } = req.params;
    const { days, targetType } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Valid analysis ID is required" });
    }

    try {
        const report = await AnalysisReport.findOne({ _id: id, user: req.user._id });
        if (!report) {
            return res.status(404).json({ success: false, message: "Analysis report not found" });
        }

        const [resume, jobDescription, externalProfiles] = await Promise.all([
            Resume.findById(report.resume),
            JobDescription.findById(report.jobDescription),
            ExternalProfile.find({ user: req.user._id, syncStatus: "ready" }),
        ]);

        if (!resume || !jobDescription) {
            return res.status(404).json({ success: false, message: "Associated resume or job description not found" });
        }

        const planDays = typeof days === "number" && days >= 1 && days <= 60 ? days : (report.customDays || 14);
        const mode = ["comprehensive", "oa", "technical"].includes(targetType) ? targetType : (report.targetType || "comprehensive");

        const comparison = compareResumeToJob(resume, jobDescription, externalProfiles, { days: planDays, targetType: mode });

        report.targetType = mode;
        report.customDays = planDays;
        report.preparationPlan = comparison.preparationPlan;
        report.companyPrepFocus = comparison.companyPrepFocus;
        report.projectRelevance = comparison.projectRelevance;
        report.shortlistBlockers = comparison.shortlistBlockers;
        report.interviewQuestions = comparison.interviewQuestions;
        report.interviewQuestionsGrouped = comparison.interviewQuestionsGrouped;

        await report.save();

        const populatedReport = await AnalysisReport.findById(report._id)
            .populate("resume", "title version")
            .populate("jobDescription", "title company");

        void cacheSet(`analysis:${report._id}`, populatedReport);

        return res.status(200).json({
            success: true,
            report: populatedReport,
        });
    } catch (error) {
        console.error("Customize analysis error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while customizing analysis",
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

export const getAnalysis = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: "A valid analysis id is required",
        });
    }

    try {
        const cached = await cacheGet(`analysis:${req.params.id}`);
        if (cached && String(cached.user) === String(req.user._id)) {
            return res.status(200).json({
                success: true,
                report: cached,
                fromCache: true,
            });
        }

        const report = await AnalysisReport.findOne({
            _id: req.params.id,
            user: req.user._id,
        })
            .populate("resume", "title version")
            .populate("jobDescription", "title company");

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Analysis report not found",
            });
        }

        void cacheSet(`analysis:${report._id}`, report);

        return res.status(200).json({
            success: true,
            report,
        });
    } catch (error) {
        console.error("Get analysis error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while loading analysis report",
        });
    }
};

export const evaluateMockInterview = async (req, res) => {
    const { id } = req.params;
    const { question, answer } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Valid analysis ID is required" });
    }

    if (!question || !answer || typeof answer !== "string" || answer.trim().length < 5) {
        return res.status(400).json({
            success: false,
            message: "A valid question and detailed answer (at least 5 characters) are required",
        });
    }

    try {
        const report = await AnalysisReport.findOne({ _id: id, user: req.user._id })
            .populate("jobDescription", "title company");

        if (!report) {
            return res.status(404).json({ success: false, message: "Analysis report not found" });
        }

        const evaluation = await evaluateMockInterviewAnswer(
            question,
            answer,
            report.jobDescription?.title || "Software Engineer",
            question
        );

        report.mockInterviews ||= [];
        report.mockInterviews.push({
            question,
            answer,
            score: evaluation.score,
            rubric: evaluation.rubric,
            feedback: evaluation.feedback,
            missingPoints: evaluation.missingPoints,
            sampleIdealAnswer: evaluation.sampleIdealAnswer,
            evaluatedAt: new Date(),
        });

        await report.save();
        void cacheSet(`analysis:${report._id}`, report);

        return res.status(200).json({
            success: true,
            evaluation,
            mockInterviews: report.mockInterviews,
        });
    } catch (error) {
        console.error("Evaluate mock interview error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while evaluating mock interview response",
        });
    }
};

