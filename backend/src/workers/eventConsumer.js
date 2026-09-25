import { startConsumer } from "../config/kafka.js";

export const initEventConsumer = async () => {
    if (!process.env.KAFKA_BROKERS) return;

    await startConsumer(
        "careersignal-worker-group",
        ["analysis.completed", "resume.uploaded"],
        async (topic, event) => {
            console.log(`[Kafka Worker] Received event on topic: ${topic}`);
            if (topic === "analysis.completed") {
                console.log(`[Kafka Worker] Analysis completed for report: ${event.reportId}, user: ${event.userId}`);
            } else if (topic === "resume.uploaded") {
                console.log(`[Kafka Worker] Resume uploaded for resume: ${event.entityId}`);
            }
        }
    );
};
