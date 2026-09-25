import { createClient } from "redis";

let redisClient;
let hasLoggedFailure = false;

export const getRedisClient = async () => {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    try {
        const client = createClient({
            url: process.env.REDIS_URL || "redis://localhost:6379",
            socket: {
                connectTimeout: 3000,
                reconnectStrategy: (retries) => {
                    if (retries > 2) return false;
                    return Math.min(retries * 500, 2000);
                },
            },
        });

        client.on("error", (err) => {
            if (!hasLoggedFailure) {
                console.warn("[Redis] Optional cache unavailable:", err.message);
                hasLoggedFailure = true;
            }
        });

        await client.connect();
        redisClient = client;
        hasLoggedFailure = false;
        return redisClient;
    } catch (err) {
        if (!hasLoggedFailure) {
            console.warn("[Redis] Connection could not be established. Running without cache:", err.message);
            hasLoggedFailure = true;
        }
        return null;
    }
};
