import { configDotenv } from "dotenv";
configDotenv({quiet: true})

import { Worker } from "bullmq";
import { sendEmail } from "../services/email.service.ts";
import { appendFailedTasksToDLQ } from "../utils/AppendQueue.ts";
import { Campaign } from "../models/campaign.model.ts";
import connectDB from "../config/db.ts";

await connectDB();

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || 'velo-redis-queue'
}

const worker = new Worker(
    'emailQueue',
    async (job) => {
        const { to, subject, body, recipientName, campaignId } = job.data;

        console.log("CampaignID at worker level: ", campaignId)
        await Campaign.findByIdAndUpdate(campaignId, {
            $set: {
                status: "in-progress"
            }
        })

        console.log(`Processing email job ${job.id}:`, {
            to,
            subject,
            recipientName,
            campaignId
        });
        
        const {response, accepted, rejected} = await sendEmail(to, subject, body);
        console.log("Response: ", response);
        console.log("Accepted: ", accepted);
        console.log("Rejected: ", rejected);
        console.log(`Email sent successfully to ${to}`);
    },
    {
        connection, 
        limiter: { // 10 emails in 1 second
            max: 10, 
            duration: 1000
        }
    }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
    console.log(`Job ${job?.id} failed with error: ${err.message}`);

    if(!job) return;

    if(job.attemptsMade && job.opts?.attempts && job.attemptsMade >= job.opts.attempts){
        console.log(`Job ${job.id} has failed ${job.attemptsMade} times, moving to DLQ`);

        await appendFailedTasksToDLQ({
            originalJobId: job?.id!,
            jobData: job.data,
            error: err.message,
            failedAt: new Date()
        })
    }
});