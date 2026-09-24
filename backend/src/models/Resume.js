import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
    {
        company: { type: String, trim: true },
        role: { type: String, trim: true },
        startDate: Date,
        endDate: Date,
        current: Boolean,
        description: String,
        skills: [{ type: String, trim: true }],
    },
    { _id: false }
);

const projectSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        description: String,
        technologies: [{ type: String, trim: true }],
        url: String,
    },
    { _id: false }
);

const resumeSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        title: { type: String, required: true, trim: true },
        fileName: String,
        fileUrl: String,
        rawText: { type: String, required: true },
        parsedProfile: {
            summary: String,
            skills: [{ type: String, trim: true }],
            experience: [experienceSchema],
            projects: [projectSchema],
            education: [String],
        },
        version: { type: Number, default: 1 },
        status: {
            type: String,
            enum: ["uploaded", "processing", "ready", "failed"],
            default: "uploaded",
        },
    },
    { timestamps: true }
);

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;
