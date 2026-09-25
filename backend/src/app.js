import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import jobDescriptionRoutes from "./routes/jobDescriptionRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import externalProfileRoutes from "./routes/externalProfileRoutes.js";

dotenv.config();

const app = express();

const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

const defaultOrigins = [
    "https://resume-ai-eight-zeta.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
];

const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (process.env.FRONTEND_URL === "*") return true;

    const normalized = origin.replace(/\/$/, "");
    if (allowedOrigins.has(normalized)) return true;

    // Automatically allow all Vercel deployments (production + branch previews)
    if (/^https:\/\/.*\.vercel\.app$/.test(normalized)) return true;

    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
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
app.use("/api/profiles", externalProfileRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
});

export default app;
