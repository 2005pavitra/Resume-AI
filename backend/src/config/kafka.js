import { Kafka } from "kafkajs";

let producer;
let consumer;

const getKafkaClient = () => {
    if (!process.env.KAFKA_BROKERS) return null;

    return new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || "careersignal-api",
        brokers: process.env.KAFKA_BROKERS.split(",").map((broker) => broker.trim()),
    });
};

const getProducer = async () => {
    if (producer) return producer;
    const kafka = getKafkaClient();
    if (!kafka) return null;

    producer = kafka.producer();
    await producer.connect();
    return producer;
};

export const publishEvent = async (topic, event) => {
    try {
        const kafkaProducer = await getProducer();
        if (!kafkaProducer) return false;

        await kafkaProducer.send({
            topic,
            messages: [{
                key: event.entityId ? String(event.entityId) : undefined,
                value: JSON.stringify({
                    ...event,
                    occurredAt: new Date().toISOString(),
                }),
            }],
        });

        return true;
    } catch (error) {
        console.error(`Kafka event publish failed for ${topic}:`, error.message);
        return false;
    }
};

export const startConsumer = async (groupId = "careersignal-workers", topics = ["analysis.completed", "resume.uploaded"], handler) => {
    try {
        const kafka = getKafkaClient();
        if (!kafka) return null;

        consumer = kafka.consumer({ groupId });
        await consumer.connect();

        for (const topic of topics) {
            await consumer.subscribe({ topic, fromBeginning: false });
        }

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const parsed = JSON.parse(message.value.toString());
                    if (handler) await handler(topic, parsed);
                } catch (err) {
                    console.error(`Error processing Kafka message on ${topic}:`, err.message);
                }
            },
        });

        return consumer;
    } catch (error) {
        console.error("Kafka consumer initialization skipped or failed:", error.message);
        return null;
    }
};

