import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { initEventConsumer } from "./src/workers/eventConsumer.js";

const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            void initEventConsumer();
        });
    })
    .catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });

