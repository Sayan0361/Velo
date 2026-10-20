import mongoose from "mongoose"
import type { AnalyticsType } from "../types/Analytics.type.ts";

const analyticsSchema = new mongoose.Schema<AnalyticsType>({
    successCount: {
        type: Number,
        default: 0
    },
    failureCount: {
        type: Number,
        default: 0
    },
    errors: {
        type: [String],
        default: []
    },

}, { timestamps: true });

export const Analytics: mongoose.Model<AnalyticsType> = mongoose.model("Analytics", analyticsSchema);