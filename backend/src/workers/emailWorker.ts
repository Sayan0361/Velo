import { configDotenv } from "dotenv";
configDotenv({ quiet: true });

import { Worker } from "bullmq";
import { sendEmail } from "../services/email.service.ts";
import { appendFailedTasksToDLQ } from "../utils/AppendQueue.ts";
import { Campaign } from "../models/campaign.model.ts";
import connectDB from "../config/db.ts";

await connectDB();

const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "velo-redis-queue"
};

const worker = new Worker(
    "emailQueue",
    async (job) => {
        const { to, subject, body, campaignId } = job.data;

        await Campaign.findByIdAndUpdate(campaignId, {
            $set: {
                status: "in-progress"
            }
        });

        const response = await sendEmail(to, subject, body);

        const acceptedEmails = response.accepted;
        const rejectedEmails = response.rejected;

        if (
            rejectedEmails.includes(to) ||
            !acceptedEmails.includes(to)
        ) {
            throw new Error(`Email was not accepted by SMTP: ${to}`);
        }

        const updatedCampaign = await Campaign.findByIdAndUpdate(
            campaignId,
            {
                $addToSet: {
                    successEmails: to
                }
            },
            {
                new: true
            }
        );

        return {
            success: true,
            email: to
        };
    },
    {
        connection,
        limiter: {
            max: 10,
            duration: 1000
        }
    }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);

    if (!job) {
        return;
    }

    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade < maxAttempts) {
        return;
    }

    console.log(
        `Job ${job.id} exhausted ${job.attemptsMade} attempts. Moving to DLQ.`
    );

    try {
        await Campaign.findByIdAndUpdate(job.data.campaignId, {
            $addToSet: {
                failedEmails: job.data.to
            }
        });

        await appendFailedTasksToDLQ({
            originalJobId: job.id!,
            jobData: job.data,
            error: err.message,
            failedAt: new Date()
        });
    } catch (error) {
        console.error(
            `Failed to record final failure for job ${job.id}:`,
            error
        );
    }
});

worker.on("error", (err) => {
    console.error("Email worker error:", err);
});
