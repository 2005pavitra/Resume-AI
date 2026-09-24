import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
    {
        skills: { type: Number, min: 0, max: 100 },
        experience: { type: Number, min: 0, max: 100 },
        projects: { type: Number, min: 0, max: 100 },
        dsa: { type: Number, min: 0, max: 100 },
        jobSpecific: { type: Number, min: 0, max: 100 },
    },
    { _id: false }
);

const evidenceSchema = new mongoose.Schema(
    {
        skill: { type: String, required: true, trim: true },
        detected: { type: Boolean, required: true },
        sources: [{ type: String, enum: ["resume", "github", "coding_profile", "portfolio"] }],
        evidence: String,
        confidence: { type: String, enum: ["low", "medium", "high"] },
        priority: { type: String, enum: ["critical", "important", "nice_to_have"] },
    },
    { _id: false }
);

const preparationItemSchema = new mongoose.Schema(
    {
        dayStart: { type: Number, min: 1 },
        dayEnd: { type: Number, min: 1 },
        topic: { type: String, required: true },
        tasks: [String],
        priority: { type: String, enum: ["critical", "important", "nice_to_have"] },
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        category: { type: String, enum: ["technical", "project", "behavioral"] },
        sourceSkill: String,
        answerNotes: String,
    },
    { _id: false }
);

const reportSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
        jobDescription: { type: mongoose.Schema.Types.ObjectId, ref: "JobDescription", required: true },
        overallFit: { type: Number, min: 0, max: 100, required: true },
        scoreBreakdown: { type: scoreSchema, required: true },
        strengths: [String],
        gaps: [evidenceSchema],
        recommendedProjects: [String],
        preparationPlan: [preparationItemSchema],
        interviewQuestions: [questionSchema],
        analysisVersion: { type: String, default: "v1" },
        status: {
            type: String,
            enum: ["queued", "processing", "complete", "failed"],
            default: "queued",
        },
        generatedAt: Date,
    },
    { timestamps: true }
);

reportSchema.index({ user: 1, createdAt: -1 });

const AnalysisReport = mongoose.model("AnalysisReport", reportSchema);

export default AnalysisReport;
