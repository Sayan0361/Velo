// Will accept job data and add it to the queue
// This is for Email only now!
// After campaign is created, call this function to add jobs to the queue
// Return if the jobs are added are queue with schedule time (now or later)

import type { EmailJobData, FailedJobData } from "../types/EmailJobData.type.ts";
import dlq from "../workers/queues/dlq.ts";
import emailQueue from "../workers/queues/emailQueue.ts";
import { QueueEvents } from "bullmq";


const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "velo-redis-queue"
};

export const appendEmailToQueue = async (
    emailJobData: EmailJobData
) => {
    const { recipients, ...jobData } = emailJobData;

    const results = {
        success: 0,
        failed: 0,
        successEmails: [] as string[],
        failedEmails: [] as string[]
    };

    const queueEvents = new QueueEvents("emailQueue", {
        connection
    });

    await queueEvents.waitUntilReady();

    try {
        const jobs = await Promise.all(
            recipients.map(async (recipient) => {
                try {
                    const delay =
                        jobData.scheduleLater && jobData.scheduleTime
                            ? Math.max(
                                0,
                                jobData.scheduleTime.getTime() - Date.now()
                            )
                            : 0;

                    const job = await emailQueue.add(
                        "sendEmail",
                        {
                            ...jobData,
                            to: recipient.email,
                            recipientName: recipient.name
                        },
                        {
                            delay,
                            attempts: 2,
                            backoff: {
                                type: "fixed",
                                delay: 3000
                            }
                        }
                    );

                    return {
                        email: recipient.email,
                        job
                    };
                } catch (error) {
                    console.error(
                        `Failed to enqueue ${recipient.email}:`,
                        error
                    );

                    results.failed++;
                    results.failedEmails.push(recipient.email);
                    return null;
                }
            })
        );

        await Promise.all(
            jobs.map(async (item) => {
                if (!item) return;

                try {
                    await item.job.waitUntilFinished(queueEvents);

                    results.success++;
                    results.successEmails.push(item.email);
                } catch (error) {
                    results.failed++;
                    results.failedEmails.push(item.email);

                    console.error(
                        `Email job failed for ${item.email}:`,
                        error
                    );
                }
            })
        );
    } finally {
        await queueEvents.close();
    }

    return results;
};

export const appendFailedTasksToDLQ = async (
    failedJobData: FailedJobData
) => {
    await dlq.add("failedTask", failedJobData);
};