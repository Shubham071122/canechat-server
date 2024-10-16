import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const aToken =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");
        const rToken = req.cookies?.refreshToken;

        // Both tokens are missing, unauthorized access
        if (!aToken && !rToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Access token is missing but refresh token is present
        if (!aToken && rToken) {
            // Verify refresh token and generate a new access token
            const decodedRefreshToken = jwt.verify(
                rToken,
                process.env.REFRESH_TOKEN_SECRET
            );
            const user = await User.findById(decodedRefreshToken._id);

            if (!user) {
                throw new ApiError(401, "Invalid Refresh Token");
            }

            // Generate a new access token
            aToken = user.generateAccessToken();

            // Send the new access token back to the client (using cookies or header)
            const options = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production", // true in production
                sameSite:
                    process.env.NODE_ENV === "production" ? "none" : "lax",
            };

            res.cookie("accessToken", aToken, options);
        }

        // Verify access token
        const decodedToken = jwt.verify(
            aToken,
            process.env.ACCESS_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        // If access token is expired and refresh token is present, generate new access token
        if (error.name == "TokenExpiredError" && req.cookies?.refreshToken) {
            return generateNewAccessToken(req, res, next);
        }

        throw new ApiError(401, error.message || "Invalid access token");
    }
});

//** HELPER FUNCTION TO GENERATE A NEW ACCESS TOKEN: */
const generateNewAccessToken = async (req, res) => {
    try {
        const rToken = req.cookies?.refreshToken;

        console.log("rtoke:",rToken);

        if (!rToken) {
            throw new ApiError(
                401,
                "Refersh token is missing , cannot generate new access token"
            );
        }

        const decodedRefreshToken = jwt.verify(
            rToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        console.log("decodedRefreshToken:",decodedRefreshToken);
        const user = await User.findById(decodedRefreshToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        // Generate new access token
        const newAccessToken = user.generateAccessToken();
        console.log("genrating newAccessToken:",newAccessToken)

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // true in production
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        return res.cookie("accessToken", newAccessToken, options);
        console.log("sending cookie");

        req.user = user;

    } catch (error) {
        throw new ApiError(401, "Failed to generate new access token");
    }
};
