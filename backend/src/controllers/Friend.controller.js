import { FriendRequest } from "../models/FriendRequest.model.js";
import { Friend } from "../models/Friend.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";
import { BlockedUser } from "../models/BlockUser.model.js";

//****** SENDING FRIEND REQUEST ******* */
const sendFriendRequest = asyncHandler(async (req, res) => {
    const fromUser = req.user._id; // ID of the user sending the request
    const { toFriend } = req.body; // Username of the recipient

    if (!toFriend) {
        throw new ApiError(400, "Recipient username (toFriend) is required.");
    }

    const toUser = await User.findOne({ userName: toFriend }); // Getting recipient ID

    if (!toUser) {
        throw new ApiError(404, "User not found.");
    }

    // Prevent sending a friend request to oneself
    if (fromUser.equals(toUser._id)) {
        throw new ApiError(
            400,
            "You cannot send a friend request to yourself."
        );
    }

    // Check if the users are already friends
    const existingFriendship = await Friend.findOne({
        $or: [
            { currentUser: fromUser, friend: toUser._id },
            { currentUser: toUser._id, friend: fromUser },
        ],
    });

    if (existingFriendship) {
        throw new ApiError(400, "You are already friends with this user.");
    }

    // Checking if a friend request has already been sent
    const existingRequest = await FriendRequest.findOne({
        fromUser,
        toUser: toUser._id,
    });

    if (existingRequest) {
        throw new ApiError(400, "Friend request already sent.");
    }

    try {
        // Create a new friend request
        const friendRequest = await FriendRequest.create({
            fromUser,
            toUser: toUser._id,
            status: "pending",
        });

        await friendRequest.save();

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    friendRequest,
                    "Friend request sent successfully."
                )
            );
    } catch (error) {
        console.error("Error sending friend request:", error);
        throw new ApiError(500, "Internal server error.");
    }
});

//****** ACCEPT FRIEND REQUEST ******* */
const acceptFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.body; //id
    const userId = req.user._id;
    console.log("rid:",requestId);
    console.log('uid:',userId);

    if (!requestId) {
        throw new ApiError(400, "Request ID is required.");
    }

    try {
        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            throw new ApiError(404, "Friend request not found.");
        }

        if (friendRequest.status !== "pending") {
            throw new ApiError(
                400,
                "This friend request has already been responded to."
            );
        }

        // Only recipient can accept this request.
        if (!friendRequest.toUser.equals(userId)) {
            throw new ApiError(
                403,
                "You are not authorized to accept this friend request."
            );
        }

        //Updating request
        friendRequest.status = "accepted";
        await friendRequest.save();

        await Friend.create([
            {
                currentUser: friendRequest.fromUser,
                friend: friendRequest.toUser,
            },
            {
                currentUser: friendRequest.toUser,
                friend: friendRequest.fromUser,
            },
        ]);

        //TODO: MAKE SOME DLETEING FEATURE AFTER REQUESt ACCEPT.
        // Delete entry from friend request collection
        // await FriendRequest.findByIdAndDelete(requestId);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    friendRequest,
                    "Friend request accepted successfully."
                )
            );
    } catch (error) {
        console.error("Error while accepting friend request:", error);
        throw new ApiError(500, error, "Internal server error.");
    }
});

//****** REJECT FRIEND REQUEST ******* */
const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.body; //id
    const userId = req.user._id;

    if (!requestId) {
        throw new ApiError(400, "Request ID is required.");
    }

    try {
        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            throw new ApiError(404, "Friend request not found.");
        }

        // Only recipient can accept this request.
        if (!friendRequest.toUser.equals(userId)) {
            throw new ApiError(
                403,
                "You are not authorized to reject this friend request."
            );
        }

        if (friendRequest.status !== "pending") {
            throw new ApiError(
                400,
                "This friend request has already been responded to."
            );
        }

        //Update the
        friendRequest.status = "rejected";
        await friendRequest.save();

        //TODO: MAKE SOME DLETEING FEATURE AFTER REQUEST REJECT.
        // Delete entry from friend request collection
        await FriendRequest.findByIdAndDelete(requestId);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    friendRequest,
                    "Friend request rejected successfully."
                )
            );
    } catch (error) {
        console.error("Error while rejecting friend request:", error);
        throw new ApiError(500, "Internal server error.");
    }
});

//****** GET FRIENDS ******* */
const getALLFriends = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        const friends = await Friend.find({ currentUser: userId }).populate(
            "friend"
        );

        const formattedFriends = friends.map((friendship) => ({
            friendId: friendship.friend._id,
            friendUserName: friendship.friend.userName,
            friendFullName: friendship.friend.fullName,
        }));

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    formattedFriends,
                    "Friends fetched successfully"
                )
            );
    } catch (error) {
        console.log("Error fetching friends:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//****  Fetching Friend Requests Based on Status **** */
const getFriendRequests = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { status } = req.query;

    try {
        const friendRequests = await FriendRequest.find({
            toUser: userId,
            status: status || "pending",
        }).populate("fromUser", "userName fullName avatar");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    friendRequests,
                    "Friend requests fetched successfully"
                )
            );
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//**** UNFRIEND *****  */
const unFriend = asyncHandler(async (req, res) => {
    const { friendUserName } = req.body; //userName
    const userId = req.user._id;

    if (!friendUserName) {
        throw new ApiError(400, "Friend's username is required.");
    }

    const friendUser = await User.findOne({ userName: friendUserName });

    if (!friendUser) {
        throw new ApiError(404, "User not found.");
    }

    // Checking if the user is trying to unfriend themselves
    if (userId.equals(friendUser._id)) {
        throw new ApiError(400, "You cannot unfriend yourself.");
    }

    // Checking if the user is friends with the specified user
    const friendship = await Friend.findOne({
        $or: [
            { currentUser: userId, friend: friendUser._id },
            { currentUser: friendUser._id, friend: userId },
        ],
    });

    if (!friendship) {
        throw new ApiError(404, "Friendship not found.");
    }

    try {
        // Delete the friendship connections
        await Friend.deleteMany({
            $or: [
                { currentUser: userId, friend: friendUser._id },
                { currentUser: friendUser._id, friend: userId },
            ],
        });
        return res
            .status(200)
            .json(
                new ApiResponse(200, null, "Friendship removed successfully.")
            );
    } catch (error) {
        console.log("Error while unfriend:", error);
        throw new ApiError(500, "Intrnal server error");
    }
});

//**** BLOCK USER  ***** */
const blockUser = asyncHandler(async (req, res) => {
    const { friendUserName } = req.body; //username
    const userId = req.user._id;

    if (!friendUserName) {
        throw new ApiError(400, "Friend's username is required.");
    }

    const friendUser = await User.findOne({ userName: friendUserName });

    if (!friendUser) {
        throw new ApiError(404, "User not found.");
    }

    // Checking if the user is trying to block themselves
    if (userId.equals(friendUser._id)) {
        throw new ApiError(400, "You cannot block yourself.");
    }

    // Checking if the user is already blocked
    const existingBlock = await BlockedUser.findOne({
        blocker: userId,
        blocked: friendUser._id,
    });

    if (existingBlock) {
        throw new ApiError(400, "You have already blocked this user.");
    }

    // Checking if the user is friends with the specified user
    const friendship = await Friend.findOne({
        $or: [
            { currentUser: userId, friend: friendUser._id },
            { currentUser: friendUser._id, friend: userId },
        ],
    });

    if (!friendship) {
        throw new ApiError(404, "Friendship not found.");
    }

    try {
        // Creating a new block entry
        const newBlock = await BlockedUser.create({
            blocker: userId,
            blocked: friendUser._id,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, newBlock, "User blocked successfully."));
    } catch (error) {
        console.log("Error while blocking the user:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//****** UNBLOCK USER ***** */
const unblockUser = asyncHandler(async (req, res) => {
    const { friendUserName } = req.body; //username
    const userId = req.user._id;

    if (!friendUserName) {
        throw new ApiError(400, "Friend's username is required.");
    }

    const friendUser = await User.findOne({ userName: friendUserName });

    if (!friendUser) {
        throw new ApiError(404, "User not found.");
    }

    // Checking if the user is trying to unblock themselves
    if (userId.equals(friendUser._id)) {
        throw new ApiError(400, "You cannot unblock yourself.");
    }

    // Checking if the user has already unblocked the friend
    const existingBlock = await BlockedUser.findOne({
        blocker: userId,
        blocked: friendUser._id,
    });

    if (!existingBlock) {
        throw new ApiError(404, "Block entry not found.");
    }

    // Checking if the user is friends with the specified user
    const friendship = await Friend.findOne({
        $or: [
            { currentUser: userId, friend: friendUser._id },
            { currentUser: friendUser._id, friend: userId },
        ],
    });

    if (!friendship) {
        throw new ApiError(404, "Friendship not found.");
    }

    try {
        // Remove the block entry
        await BlockedUser.deleteOne({
            blocker: userId,
            blocked: friendUser._id,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, null, "User unblocked successfully."));
    } catch (error) {
        console.log("Error while unblocking the user;", error);
        throw new ApiError(500, "Internal server error");
    }
});

export {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getALLFriends,
    getFriendRequests,
    unFriend,
    blockUser,
    unblockUser,
};
