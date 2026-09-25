import jwt from "jsonwebtoken";
import { getRedisClient } from "../config/redis.js";

const JWT_SECRET = process.env.JWT_SECRET || "resume_ai_secret";

export const logoutUser = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(400).json({
                success: false,
                message: "Authorization token is required",
            });
        }

        const token = authHeader.split(" ")[1];
        let decoded;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(200).json({
                    success: true,
                    message: "Token already expired. Session is effectively logged out.",
                });
            }
            throw error;
        }

        const client = await getRedisClient();
        if (client) {
            const remainingSeconds = Math.max(
                1,
                Math.floor((decoded.exp * 1000 - Date.now()) / 1000)
            );

            await client.set(`blacklisted:${decoded.jti}`, "1", {
                EX: remainingSeconds,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
