import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        userName: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        avatar: {
            type: String,// we use cloudinary url for image.
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    try {
        const accessToken = jwt.sign(
            {
                _id: this._id,
                userName: this.userName,
                email: this.email,
                fullName: this.fullName,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            }
        );
        return accessToken;
    } catch (error) {
        console.log("Error generating access token: ", error);
    }
};

userSchema.methods.generateRefreshToken = function () {
    try {
        const refreshToken = jwt.sign(
            {
                _id: this._id,
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
            }
        );
        return refreshToken;
    } catch (error) {
        console.log("Error while genterating refreshtoken: ", error);
    }
};

export const User = mongoose.model("User", userSchema);
