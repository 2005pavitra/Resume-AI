import JobDescription from "../models/JobDescription.js";

export const createJobDescription = async (req, res) => {
    try {
        const { title, company, sourceUrl, rawText, parsedRequirements } = req.body;

        if (!title || !rawText) {
            return res.status(400).json({
                success: false,
                message: "Job title and description text are required",
            });
        }

        const jobDescription = await JobDescription.create({
            user: req.user._id,
            title,
            company,
            sourceUrl,
            rawText,
            parsedRequirements,
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
