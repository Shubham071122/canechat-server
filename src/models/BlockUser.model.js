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
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        unblockDate: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

// Ensuring the combination of blocker and blocked is unique only for active blocks
blockedUserSchema.index({ blocker: 1, blocked: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export const BlockedUser = mongoose.model("BlockedUser", blockedUserSchema);
