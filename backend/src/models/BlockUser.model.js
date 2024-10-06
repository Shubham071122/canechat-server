import mongoose, { Schema } from "mongoose";

const blockedUserSchema = new Schema(
    {
        blocker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        blocked: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

// Ensuring the combination of blocker and blocked is unique
blockedUserSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const BlockedUser = mongoose.model("BlockedUser", blockedUserSchema);
