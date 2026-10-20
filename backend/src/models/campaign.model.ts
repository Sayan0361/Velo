import mongoose from "mongoose";
import type { CampaignType } from "../types/Campaign.type.ts";

const campaignSchema = new mongoose.Schema<CampaignType>(
    {
        campaignName: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        channel: {
            type: String,
            enum: ["email", "sms"],
            required: true,
        },

        groupName: {
            type: String,
            trim: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        scheduledFor: {
            type: String,
            enum: ["now", "later"],
            default: "now",
            required: true,
        },

        scheduledAt: {
            type: Date,

            validate: {
                validator: function (this: CampaignType, value: Date) {

                    if (this.scheduledFor === "later") {
                        return !!value;
                    }

                    return true;
                },

                message:
                    "scheduledAt required when scheduledFor is later",
            },
        },

        status: {
            type: String,

            enum: [
                "pending",
                "in-progress",
                "completed",
                "failed",
            ],

            default: "pending",
        },

        recipientListURL: {
            type: String,
            required: true,
            trim: true,
        },

        messageBodyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            required: true,
        },

        analyticsId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Analytics",
        },

        successEmails: {
            type: [String],
            default: []
        },
        
        failedEmails: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true,
    }
);

export const Campaign = mongoose.model<CampaignType>(
    "Campaign",
    campaignSchema
);