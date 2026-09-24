import Resume from "../models/Resume.js";

export const createResume = async (req, res) => {
    try {
        const { title, rawText, fileName, fileUrl, parsedProfile } = req.body;

        if (!title || !rawText) {
            return res.status(400).json({
                success: false,
                message: "Resume title and text are required",
            });
        }

        const resume = await Resume.create({
            user: req.user._id,
            title,
            rawText,
            fileName,
            fileUrl,
            parsedProfile,
            status: parsedProfile ? "ready" : "uploaded",
        });

        return res.status(201).json({
            success: true,
            resume,
        });
    } catch (error) {
        console.error("Create resume error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while saving resume",
        });
    }
};

export const listResumes = async (req, res) => {
    try {
        const resumes = await Resume.find({ user: req.user._id })
            .select("title fileName version status createdAt updatedAt")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            resumes,
        });
    } catch (error) {
        console.error("List resumes error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while loading resumes",
        });
    }
};
