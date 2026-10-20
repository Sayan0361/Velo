import { configDotenv } from "dotenv";
configDotenv({quiet: true})
import { Worker } from "bullmq";
import { BlockedEmail } from "../models/blocked-email.model.ts";
import connectDB from "../config/db.ts";

const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "velo-redis-queue"
};

const reasonMap: Record<string, string> = {
    mx: "invalid",
    syntax: "invalid",
    blacklisted: "others"
};

await connectDB();

const badEmailWorker = new Worker(
    "badEmailQueue",

    async (job) => {
        const { recipient, reason } = job.data;
        const email = recipient.email;

        console.log("Bad email:", email, reason);
        const invalidReason = reasonMap[reason] ?? "others";

        await BlockedEmail.updateOne(
            { email },
            {
                $setOnInsert: {
                    email,
                    reason,
                },
            },
            { upsert: true }
        );
    },

    { connection }
);

badEmailWorker.on("ready", () => {
    console.log("Bad email worker is ready");
});

badEmailWorker.on("active", (job) => {
    console.log("Processing job:", job.id, job.data);
});

badEmailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

badEmailWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});

badEmailWorker.on("error", (err) => {
    console.error("Worker error:", err);
});