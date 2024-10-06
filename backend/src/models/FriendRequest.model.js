import mongoose, { Schema } from "mongoose";

const friendRequestSchema = new Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: { 
            type: String, 
            enum: ['pending', 'accepted', 'rejected'], 
            default: 'pending' 
        },
    },
    {
        timestamps: true, 
    }
);

// Ensuring the combination of fromUser and toUser is unique
friendRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

export const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
