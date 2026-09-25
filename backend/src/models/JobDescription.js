import mongoose from "mongoose";

const jobDescriptionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        title: { type: String, required: true, trim: true },
        company: { type: String, trim: true },
        sourceUrl: String,
        rawText: { type: String, required: true },
        parsedRequirements: {
            requiredSkills: [{ type: String, trim: true }],
            preferredSkills: [{ type: String, trim: true }],
            responsibilities: [String],
            experienceLevel: String,
        },
        contentHash: { type: String, index: true },
    },
    { timestamps: true }
);

jobDescriptionSchema.index({ user: 1, contentHash: 1 });
jobDescriptionSchema.index({ user: 1, title: 1, company: 1 });

const JobDescription = mongoose.model("JobDescription", jobDescriptionSchema);

export default JobDescription;

