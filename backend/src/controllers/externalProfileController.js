import ExternalProfile from "../models/ExternalProfile.js";
import { syncExternalProfile } from "../services/externalProfileService.js";
import { publishEvent } from "../config/kafka.js";

const supportedProviders = ["github", "leetcode", "codeforces", "codechef"];

const normalizeUsername = (provider, value) => {
    const input = value.trim().replace(/\/+$/, "");

    try {
        const url = new URL(input);
        const parts = url.pathname.split("/").filter(Boolean);
        if (provider === "github") return parts[0] || input;
        if (provider === "leetcode") return parts[parts[0] === "u" ? 1 : 0] || input;
        return parts[parts.length - 1] || input;
    } catch {
        return input.replace(/^@/, "");
    }
};

export const syncProfile = async (req, res) => {
    const { provider } = req.params;
    const { username } = req.body;

    if (!supportedProviders.includes(provider) || !username?.trim()) {
        return res.status(400).json({
            success: false,
            message: "A supported provider and username are required",
        });
    }

    const normalizedUsername = normalizeUsername(provider, username);

    try {
        const result = await syncExternalProfile(provider, normalizedUsername);
        const profile = await ExternalProfile.findOneAndUpdate(
            { user: req.user._id, provider },
            {
                user: req.user._id,
                provider,
                username: normalizedUsername,
                profileUrl: result.profileUrl,
                snapshot: result.snapshot,
                lastSyncedAt: new Date(),
                syncStatus: "ready",
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        void publishEvent("profile.synced", {
            entityId: profile._id,
            userId: req.user._id,
            provider,
            profileId: profile._id,
        });

        return res.status(200).json({
            success: true,
            profile,
        });
    } catch (error) {
        console.error(`${provider} profile sync error:`, error.message);
        await ExternalProfile.findOneAndUpdate(
            { user: req.user._id, provider },
            { username: normalizedUsername, syncStatus: "failed" },
            { upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(422).json({
            success: false,
            message: `Unable to sync ${provider} profile`,
        });
    }
};

export const listProfiles = async (req, res) => {
    try {
        const profiles = await ExternalProfile.find({ user: req.user._id }).sort({ updatedAt: -1 });
        return res.status(200).json({ success: true, profiles });
    } catch (error) {
        console.error("List external profiles error:", error);
        return res.status(500).json({ success: false, message: "Server error while loading external profiles" });
    }
};
