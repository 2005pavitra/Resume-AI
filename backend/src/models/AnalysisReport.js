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
        sources: [{ type: String, enum: ["resume", "github", "coding_profile", "portfolio", "project"] }],
        evidence: String,
        confidence: { type: String, enum: ["low", "medium", "high"] },
        priority: { type: String, enum: ["critical", "important", "nice_to_have"] },
    },
    { _id: false }
);

const requirementMatchSchema = new mongoose.Schema(
    {
        requirement: { type: String, required: true, trim: true },
        category: { type: String, enum: ["required_skill", "preferred_skill", "experience", "project", "architecture", "dsa"] },
        matched: { type: Boolean, required: true },
        evidence: String,
        sources: [{ type: String, enum: ["resume", "project", "github", "coding_profile", "portfolio"] }],
        confidence: { type: String, enum: ["low", "medium", "high"] },
        priority: { type: String, enum: ["critical", "important", "nice_to_have"] },
        status: { type: String, enum: ["strong_match", "partial_match", "significant_gap"] },
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
        focusArea: String,
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        category: { type: String, enum: ["technical", "project", "behavioral", "resume_deep_dive"] },
        sourceSkill: String,
        answerNotes: String,
    },
    { _id: false }
);

const aiInsightsSchema = new mongoose.Schema(
    {
        summary: String,
        recommendations: [String],
    },
    { _id: false }
);

const scoreExplanationSchema = new mongoose.Schema(
    {
        strong: [{ factor: String, evidence: String }],
        missingOrWeak: [{ factor: String, issue: String }],
    },
    { _id: false }
);

const skillGapsCategorizedSchema = new mongoose.Schema(
    {
        alreadyStrong: [{
            skill: String,
            evidence: String,
            confidence: { type: String, enum: ["low", "medium", "high"] },
            sources: [String],
        }],
        partial: [{
            skill: String,
            evidence: String,
            confidence: { type: String, enum: ["low", "medium", "high"] },
            sources: [String],
        }],
        missing: [{
            skill: String,
            evidence: String,
            confidence: { type: String, enum: ["low", "medium", "high"] },
            priority: { type: String, enum: ["critical", "important", "nice_to_have"] },
        }],
    },
    { _id: false }
);

const rankedProjectSchema = new mongoose.Schema(
    {
        rank: Number,
        name: String,
        score: Number,
        matchTier: { type: String, enum: ["primary", "secondary", "low_relevance"] },
        why: [String],
        techMatched: [String],
        deploymentEvidence: Boolean,
    },
    { _id: false }
);

const projectRelevanceSchema = new mongoose.Schema(
    {
        rankedProjects: [rankedProjectSchema],
        advice: String,
    },
    { _id: false }
);

const bulletRewriteSchema = new mongoose.Schema(
    {
        original: String,
        suggested: String,
        improvementReason: String,
        impactMetric: String,
    },
    { _id: false }
);

const atsKeywordsSchema = new mongoose.Schema(
    {
        found: [String],
        missing: [String],
        caution: String,
    },
    { _id: false }
);

const resumeOptimizationSchema = new mongoose.Schema(
    {
        bulletRewrites: [bulletRewriteSchema],
        atsKeywords: atsKeywordsSchema,
    },
    { _id: false }
);

const interviewQuestionsGroupedSchema = new mongoose.Schema(
    {
        technical: [{ question: String, context: String, topic: String }],
        resumeDeepDives: [{ question: String, claimedSkillOrProject: String, followUps: [String], whyAsked: String }],
        projectArchitecture: [{ question: String, project: String, focusArea: String }],
        behavioral: [{ question: String, scenario: String }],
    },
    { _id: false }
);

const blockerItemSchema = new mongoose.Schema(
    {
        id: Number,
        severity: { type: String, enum: ["high", "medium", "low"] },
        title: String,
        explanation: String,
        impact: String,
    },
    { _id: false }
);

const fixItemSchema = new mongoose.Schema(
    {
        order: Number,
        action: String,
        detail: String,
        estimatedEffort: String,
    },
    { _id: false }
);

const shortlistBlockersSchema = new mongoose.Schema(
    {
        blockers: [blockerItemSchema],
        fixTheseFirst: [fixItemSchema],
    },
    { _id: false }
);

const companyPrepFocusSchema = new mongoose.Schema(
    {
        companyName: String,
        focusDistribution: {
            backend: Number,
            dsa: Number,
            systemDesign: Number,
            cloud: Number,
            behavioral: Number,
        },
        likelyInterviewAreas: [String],
    },
    { _id: false }
);

const mockInterviewSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        score: { type: Number, min: 0, max: 10 },
        rubric: {
            technicalAccuracy: Number,
            clarity: Number,
            depth: Number,
            confidence: Number,
        },
        feedback: String,
        missingPoints: [String],
        sampleIdealAnswer: String,
        evaluatedAt: { type: Date, default: Date.now },
    }
);

const reportSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
        jobDescription: { type: mongoose.Schema.Types.ObjectId, ref: "JobDescription", required: true },
        overallFit: { type: Number, min: 0, max: 100, required: true },
        scoreBreakdown: { type: scoreSchema, required: true },
        scoreExplanations: { type: scoreExplanationSchema },
        requirementMatches: [requirementMatchSchema],
        strengths: [String],
        gaps: [evidenceSchema],
        skillGapsCategorized: { type: skillGapsCategorizedSchema },
        projectRelevance: { type: projectRelevanceSchema },
        recommendedProjects: [String],
        preparationPlan: [preparationItemSchema],
        resumeOptimization: { type: resumeOptimizationSchema },
        interviewQuestions: [questionSchema],
        interviewQuestionsGrouped: { type: interviewQuestionsGroupedSchema },
        shortlistBlockers: { type: shortlistBlockersSchema },
        companyPrepFocus: { type: companyPrepFocusSchema },
        candidateSignals: {
            githubSnapshot: mongoose.Schema.Types.Mixed,
            codingSnapshot: mongoose.Schema.Types.Mixed,
        },
        mockInterviews: [mockInterviewSchema],
        targetType: {
            type: String,
            enum: ["comprehensive", "oa", "technical"],
            default: "comprehensive",
        },
        customDays: {
            type: Number,
            default: 14,
        },
        aiInsights: { type: aiInsightsSchema, default: undefined },
        analysisVersion: { type: String, default: "v2" },
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
reportSchema.index({ user: 1, resume: 1, jobDescription: 1 });

const AnalysisReport = mongoose.model("AnalysisReport", reportSchema);

export default AnalysisReport;


