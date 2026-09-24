import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import jobDescriptionRoutes from "./routes/jobDescriptionRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = new Set([
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
].filter(Boolean));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS"));
    },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Resume AI API is running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobs", jobDescriptionRoutes);
app.use("/api/analysis", analysisRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
});

export default app;
