import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,

        },
        recipient : {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        edited: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent",
          },
          
    },
    {
        timestamps: true,
    }
);

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });


export const Message = mongoose.model("Message", messageSchema);
