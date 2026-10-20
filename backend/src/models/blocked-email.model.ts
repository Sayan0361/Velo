import mongoose from "mongoose";

const blockedEmailSchema =
    new mongoose.Schema({
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        reason: {
            type: String,
            enum: [
                "bounce",
                "invalid",
                "complaint",
                "mx",
                "others",
                "blacklisted"
            ],
            required: true
        }
    }, {
        timestamps: true
    });

export const BlockedEmail =
    mongoose.model(
        "BlockedEmail",
        blockedEmailSchema
    );