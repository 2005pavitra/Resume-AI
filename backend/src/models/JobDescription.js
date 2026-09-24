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
    },
    { timestamps: true }
);

const JobDescription = mongoose.model("JobDescription", jobDescriptionSchema);

export default JobDescription;
