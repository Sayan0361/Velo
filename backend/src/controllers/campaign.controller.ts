import { Campaign } from "../models/campaign.model.ts";
import { Message } from "../models/message.model.ts";

import { CampaignSchema } from "../types/schemas/Campaign.schema.ts";

import AppError from "../utils/AppError.ts";
import asyncHandler from "../utils/AsycHandler.ts";

import type { AuthRequest } from "../types/express.type.ts";
import { parseCSVBuffer } from "../utils/parseCSVBuffer.ts";
import { mergeRecipients } from "../utils/mergeRecipients.ts";
import { generateCSVBuffer } from "../utils/generateCSV.ts";
import { uploadCSVToCloudinary } from "../utils/uploadCSVToCloudinary.ts";
import { appendEmailToQueue } from "../utils/AppendQueue.ts";
import badEmailQueue from "../workers/queues/badEmailQueue.ts";
import { processRecipients } from "../services/process-recipients.service.ts";
import { processBounces } from "../workers/bounce.worker.ts";

export const createCampaign = asyncHandler(async (req: AuthRequest, res) => {
    if (req.body.recipients) {
        try {
            req.body.recipients = JSON.parse(req.body.recipients);
        } catch {
            throw new AppError(
                "Invalid recipients JSON format",
                400
            );
        }
    }

    // validate request
    const parsedData = CampaignSchema.safeParse(req.body);

    if (!parsedData.success) {
        const formattedErrors =
            parsedData.error.issues.reduce(
                (
                    acc: Record<string, string>,
                    issue
                ) => {
                    const field = issue.path[0] as string;
                    acc[field] = issue.message;
                    return acc;
                },
                {}
            );
        throw new AppError(
            "Validation failed",
            400,
            formattedErrors
        );
    }

    const data = parsedData.data;

    // validate auth
    if (!req.user) {
        throw new AppError(
            "Unauthorized",
            401
        );
    }

    // validate message template
    const messageTemplate = await Message.findById(
        data.messageBodyId
    );

    if (!messageTemplate) {
        throw new AppError(
            "Message template not found",
            404
        );
    }

    // parse uploaded CSV if exists
    let csvRecipients: any[] = [];

    if (req.file) {
        csvRecipients = await parseCSVBuffer(req.file.buffer);
    }

    // merge all recipients
    const finalRecipients = mergeRecipients(
        csvRecipients,
        data.recipients || []
    );

    // nothing to process
    if (!finalRecipients.length) {
        throw new AppError(
            "No recipients found",
            400
        );
    }

    // syntax + mx + blacklist validation
    const { validRecipients, invalidRecipients } = await processRecipients(finalRecipients);

    // push bad emails to queue
    for (const invalid of invalidRecipients) {
        await badEmailQueue.add(
            "badEmail",
            invalid
        );
    }

    // no usable emails left
    if (!validRecipients.length) {
        throw new AppError(
            "No valid recipients found",
            400
        );
    }

    // generate normalized csv
    const csvBuffer = generateCSVBuffer(finalRecipients);

    // upload final csv
    const finalCSVUrl = await uploadCSVToCloudinary(
        csvBuffer,
        `campaign-${Date.now()}`
    );

    // prepare campaign
    const campaignData: any = {
        campaignName: data.campaignName,
        channel: data.channel,
        createdBy: req.user._id,
        scheduledFor: data.scheduledFor,
        recipientListURL: finalCSVUrl,
        messageBodyId: data.messageBodyId,
        status: "pending",
        successEmails: [],
        failedEmails: []
    };

    // optional fields
    if (data.description) {
        campaignData.description = data.description;
    }

    if (data.groupName) {
        campaignData.groupName = data.groupName;
    }

    if (data.scheduledAt) {
        campaignData.scheduledAt = data.scheduledAt;
    }

    if (data.analyticsId) {
        campaignData.analyticsId = data.analyticsId;
    }

    // create campaign
    const campaign = await Campaign.create(campaignData);

    // console.log(
    //     JSON.stringify(
    //         {
    //             validRecipients,
    //             invalidRecipients
    //         },
    //         null,
    //         2
    //     )
    // );

    const emailJobData = {
        campaignId: campaign._id.toString(),
        recipients: validRecipients,
        subject: messageTemplate.subject,
        body: messageTemplate.body,
        scheduleLater: !!data.scheduledAt,
        scheduleTime: data.scheduledAt || new Date(),
    };

    const response = await appendEmailToQueue(emailJobData);
    console.log("Res: ", response)

    // // wait for 30 seconds and then check for bounced mails
    // setTimeout(async () => {
    //     try {
    //         await processBounces();
    //     } catch (err) {
    //         console.error(
    //             "Bounce check failed:",
    //             err
    //         );
    //     }
    // }, 30_000);

    return res.status(201).json({
        success: true,
        message: "Campaign created successfully",
        data: campaign,
        result: response
    });
}
);