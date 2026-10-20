import dns from "dns/promises";
import { RecipientSchema } from "../types/schemas/Recipient.schema.ts";
import { BlockedEmail } from "../models/blocked-email.model.ts";
import type { EmailRecipient } from "../types/EmailJobData.type.ts";

type ValidResult = {
    valid: true;
    recipient: EmailRecipient;
};
type InvalidResult = {
    valid: false;
    reason: "syntax" | "blacklisted" | "mx";
};

type ValidationResult = ValidResult | InvalidResult;

export const validateRecipient =
    async (recipient: any): Promise<ValidationResult> => {
        const parsed = RecipientSchema.safeParse(recipient);

        if (!parsed.success) {
            return {
                valid: false,
                reason: "syntax"
            };
        }

        const email = parsed.data.email;

        const domain = email.split("@")[1];

        try {
            const existing = await BlockedEmail.findOne({email});

            if (existing) {
                return {
                    valid: false,
                    reason: "blacklisted"
                };
            }
            
            //  Mail exchange records -> MX
            const mx = await dns.resolveMx(domain!);
            console.log("MX: ", mx);

            // Require at least one explicit MX record
            const hasValidMx = mx.some(
                record => record.exchange.trim().length > 0
            );

            if (!hasValidMx) {
                return {
                    valid: false,
                    reason: "mx"
                };
            }

            if (!mx.length) {
                return {
                    valid: false,
                    reason: "mx"
                };
            }

            return {
                valid: true,
                recipient: {
                    email: parsed.data.email,
                    ...(parsed.data.name && { name: parsed.data.name })
                } as EmailRecipient
            };

        } catch {
            return {
                valid: false,
                reason: "mx"
            };
        }
    };