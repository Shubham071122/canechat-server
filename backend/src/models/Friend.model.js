import mongoose, {Schema} from "mongoose";

const friendSchema = new Schema(
    {
        currentUser:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        friend: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    }
);

// Ensuring the combination of currentUser and friend is unique
friendSchema.index({ currentUser: 1, friend: 1 }, { unique: true });

// Adding validation to prevent a user from being friends with themselves
friendSchema.pre('save', function(next) {
    if(this.currentUser.equals(this.friend)){
        const error = new Error("A user cannot be friends with themselves");
        return next(error);
    }
    next();
});


export const Friend = mongoose.model("Friend",friendSchema);
