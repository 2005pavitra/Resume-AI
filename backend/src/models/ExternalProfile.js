import mongoose from "mongoose";

const externalProfileSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        provider: {
            type: String,
            enum: ["github", "leetcode", "codeforces", "codechef", "portfolio"],
            required: true,
        },
        username: { type: String, required: true, trim: true },
        profileUrl: String,
        snapshot: {
            repositories: Number,
            activeProjects: Number,
            languages: mongoose.Schema.Types.Mixed,
            technologies: [String],
            solved: Number,
            easy: Number,
            medium: Number,
            hard: Number,
            rating: Number,
            contests: Number,
            activityLevel: String,
        },
        lastSyncedAt: Date,
        syncStatus: {
            type: String,
            enum: ["pending", "syncing", "ready", "failed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

externalProfileSchema.index({ user: 1, provider: 1 }, { unique: true });

const ExternalProfile = mongoose.model("ExternalProfile", externalProfileSchema);

export default ExternalProfile;
