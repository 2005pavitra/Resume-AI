import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getRedisClient } from "../config/redis.js";

const JWT_SECRET = process.env.JWT_SECRET || "resume_ai_secret";

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is required",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const client = await getRedisClient();
        if (client) {
            const isBlacklisted = await client.get(`blacklisted:${decoded.jti}`);
            if (isBlacklisted) {
                return res.status(401).json({
                    success: false,
                    message: "Session expired. Please login again.",
                });
            }
        }

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
