import mongoose from "mongoose";
import { Message } from "../models/Message.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";
import { BlockedUser } from "../models/BlockUser.model.js";
import { Friend } from "../models/Friend.model.js";

//**** CREATE MESSAGE ***** */
const createMessage = asyncHandler(async (req, res) => {
    const { sender, recipient, message } = req.body;
    const userId = req.user ? req.user._id : null;
    console.log("req body sned msg:", req.body);

    if (!sender || !recipient || !message) {
        throw new ApiError(400, "All fields are required");
    }

    // Validate sender and recipient ObjectIds
    if (
        !mongoose.Types.ObjectId.isValid(sender) ||
        !mongoose.Types.ObjectId.isValid(recipient)
    ) {
        throw new ApiError(400, "Invalid sender or recipient ID");
    }

    const senderObjectId = new mongoose.Types.ObjectId(sender);
    const recipientObjectId = new mongoose.Types.ObjectId(recipient);

    // Fetching sender and recipient IDs
    const senderUser = await User.findOne({ _id: senderObjectId });
    const recipientUser = await User.findOne({ _id: recipientObjectId });

    if (!senderUser || !recipientUser) {
        throw new ApiError(404, "Sender or recipient not found");
    }

    // Checking if the sender is the logged-in user
    if (senderUser._id.toString() !== userId.toString()) {
        throw new ApiError(401, "Unauthorized request");
    }

    // Checking if the recipient has blocked the sender
    const isBlocked = await BlockedUser.findOne({
        blocker: recipientUser._id,
        blocked: senderUser._id,
        isActive: true,
    });

    // Checking if the sender and recipient are still friends
    const isFriend = await Friend.findOne({
        $or: [
            { currentUser: senderUser._id, friend: recipientUser._id },
            { currentUser: recipientUser._id, friend: senderUser._id },
        ],
    });

    if (!isFriend) {
        throw new ApiError(403, "You can only send messages to your friends.");
    }

    try {
        // Always save the message to database (even if sender is blocked)
        const newMessage = await Message.create({
            sender: senderUser._id,
            recipient: recipientUser._id,
            message,
        });

        // Only emit the message to recipient if sender is NOT blocked
        if (!isBlocked) {
            const recipientSocketId = users[recipientUser._id];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("receiveMessage", newMessage);
            }
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, newMessage, "Message sent successfully")
            );
    } catch (error) {
        console.log("Error while creating message:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//**** DELETE MESSAGE ***** */
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.body;
    const userId = req.user._id;

    if (!messageId) {
        throw new ApiError(400, "Message id is required!");
    }

    try {
        const message = await Message.findById(messageId);

        if (!message) {
            throw new ApiError(400, "Message not found");
        }

        if (
            message.sender.toString() !== userId.toString() &&
            message.recipient.toString() !== userId.toString()
        ) {
            throw new ApiError(403, "Unauthorized to delete this message");
        }

        const delMessage = await Message.deleteOne({ _id: message._id });

        return res
            .status(200)
            .json(new ApiResponse(200, "Message deleted successfully"));
    } catch (error) {
        console.log("Error while deleting message:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//**** EDIT MESSAGE ***** */
const editMessage = asyncHandler(async (req, res) => {
    const { messageId, message } = req.body;
    const userId = req.user._id;

    if (!messageId || !message) {
        throw new ApiError(400, "Message ID and message content are required!");
    }

    const existingMessage = await Message.findById(messageId);

    if (!existingMessage) {
        throw new ApiError(400, "Message not found");
    }

    if (!existingMessage.sender.equals(userId)) {
        throw new ApiError(403, "Unauthorized to edit this message");
    }

    // Checking if the sender and recipient are still friends
    const isFriend = await Friend.findOne({
        $or: [
            { currentUser: userId, friend: existingMessage.recipient },
            { currentUser: existingMessage.recipient, friend: userId },
        ],
    });

    if (!isFriend) {
        throw new ApiError(403, "You can only edit messages to your friends.");
    }

    try {
        const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            {
                $set: {
                    message: message,
                    edited: true,
                },
            },
            { new: true }
        );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedMessage,
                    "Message updated successfully"
                )
            );
    } catch (error) {
        console.log("Error while editing message:", error);
        throw new ApiError(500, "Internal sever error");
    }
});

//***** FETCH SENDER MESSAGE (i sended) ***** */
const fetchSentMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { recipient } = req.body;

    if (!recipient) {
        throw new ApiError(400, "Recipient id is required");
    }

    // Fetching sender and recipient IDs
    const recipientUser = await User.findOne({ userName: recipient });

    if (!recipientUser) {
        throw new ApiError(404, "Recipient not found");
    }

    try {
        const sentMessages = await Message.find({
            sender: userId,
            recipient: recipientUser._id,
        })
            .populate({
                path: "recipient",
                select: "userName",
            })
            .select("_id message recipient createdAt updatedAt");

        const formattedMessages = sentMessages.map((msg) => ({
            mesageId: msg._id,
            message: msg.message,
            recipientUserName: msg.recipient.userName,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
        }));

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    formattedMessages,
                    "Fetched sent messages successfully"
                )
            );
    } catch (error) {
        console.error("Error while fetching sent messages:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//***** FETCH RECIPIENT MESSAGE (i recived) ***** */
const fetchReceivedMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { sender } = req.body;

    if (!sender) {
        throw new ApiError(400, "Sender id is required");
    }

    // Fetching sender ID
    const senderUser = await User.findOne({ userName: sender });

    if (!senderUser) {
        throw new ApiError(404, "Sender not found");
    }

    try {
        const receivedMessages = await Message.find({
            sender: senderUser._id,
            recipient: userId,
        })
            .populate({
                path: "sender",
                select: "userName",
            })
            .select("_id message sender createdAt updatedAt");

        const formattedMessages = receivedMessages.map((msg) => ({
            mesageId: msg._id,
            message: msg.message,
            senderUserName: msg.sender.userName,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
        }));

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    formattedMessages,
                    "Fetched received messages successfully"
                )
            );
    } catch (error) {
        console.error("Error while fetching received messages:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//***** FRIEND WITH LAST MESSAGE ***** */
// const friendLastMessage = asyncHandler(async (req, res) => {
//     const userId = req.user.id;

//     try {
//         const friends = await Message.aggregate([
//             {
//                 $match: {
//                     $or: [
//                         { sender: new mongoose.Types.ObjectId(userId) },
//                         { recipient: new mongoose.Types.ObjectId(userId) },
//                     ],
//                 },
//             },
//             {
//                 $sort: { createdAt: -1 },
//             },
//             {
//                 $group: {
//                     _id: {
//                         $cond: {
//                             if: {
//                                 $eq: [
//                                     "$sender",
//                                     new mongoose.Types.ObjectId(userId),
//                                 ],
//                             },
//                             then: "$recipient",
//                             else: "$sender",
//                         },
//                     },
//                     lastMessage: { $first: "$$ROOT" },
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "_id",
//                     foreignField: "_id",
//                     as: "friendDetails",
//                 },
//             },
//             {
//                 $unwind: "$friendDetails",
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     friendId: "$_id",
//                     fullName: "$friendDetails.fullName",
//                     userName: "$friendDetails.userName",
//                     avatar: "$friendDetails.avatar",
//                     lastMessage: "$lastMessage.message",
//                     lastMessageTime: "$lastMessage.createdAt",
//                 },
//             },
//             {
//                 $sort: { lastMessageTime: -1 },
//             },
//         ]).exec();

//         if (friends) {
//             return res
//                 .status(200)
//                 .json(
//                     new ApiResponse(
//                         200,
//                         friends,
//                         "Friend list of last message fetched successfuly"
//                     )
//                 );
//         }
//     } catch (error) {
//         console.log("Error while fetching friends last message:", error);
//         throw new ApiError(500, "Error while fethching last message");
//     }
// });

const getFriendsWithLastMessage = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
        // Fetch all friends
        const friends = await Friend.find({ currentUser: userId }).populate(
            "friend"
        );
        const friendIds = friends.map((friendship) => friendship.friend._id);

        // Fetch last message for each friend
        const lastMessages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        {
                            sender: new mongoose.Types.ObjectId(userId),
                            recipient: { $in: friendIds },
                        },
                        {
                            recipient: new mongoose.Types.ObjectId(userId),
                            sender: { $in: friendIds },
                        },
                    ],
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: {
                                $eq: [
                                    "$sender",
                                    new mongoose.Types.ObjectId(userId),
                                ],
                            },
                            then: "$recipient",
                            else: "$sender",
                        },
                    },
                    lastMessage: { $first: "$$ROOT" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "friendDetails",
                },
            },
            {
                $unwind: "$friendDetails",
            },
            {
                $project: {
                    _id: 0,
                    friendId: "$_id",
                    fullName: "$friendDetails.fullName",
                    userName: "$friendDetails.userName",
                    avatar: "$friendDetails.avatar",
                    lastMessage: "$lastMessage.message",
                    lastMessageTime: "$lastMessage.createdAt",
                },
            },
            {
                $sort: { lastMessageTime: -1 },
            },
        ]).exec();

        // Format friends data with last messages
        const formattedFriends = friends.map((friendship) => {
            const lastMessage = lastMessages.find(
                (msg) =>
                    msg.friendId.toString() === friendship.friend._id.toString()
            );
            return {
                friendId: friendship.friend._id,
                fullName: friendship.friend.fullName,
                userName: friendship.friend.userName,
                avatar: friendship.friend.avatar,
                lastMessage: lastMessage
                    ? lastMessage.lastMessage
                    : "New, Say Hii👋",
                lastMessageTime: lastMessage
                    ? lastMessage.lastMessageTime
                    : null,
            };
        });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    formattedFriends,
                    "Friends with last message fetched successfully"
                )
            );
    } catch (error) {
        console.log("Error fetching friends with last messages:", error);
        throw new ApiError(500, "Internal server error");
    }
});

//***** FETCH ALL MESSAGES BETWEEN USERS (SENT & RECEIVED) *****/
const fetchAllMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { friendUserId } = req.body;

    if (!friendUserId) {
        throw new ApiError(400, "Friend's user ID is required");
    }

    try {
        // Check if current user has blocked the friend (active block)
        const activeBlockInfo = await BlockedUser.findOne({
            blocker: userId,
            blocked: friendUserId,
            isActive: true,
        });

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: friendUserId },
                { sender: friendUserId, recipient: userId },
            ],
        })
            .populate({
                path: "sender recipient",
                select: "userName",
            })
            .sort({ createdAt: 1 });

        let filteredMessages;
        
        if (activeBlockInfo) {
            // Currently blocked: show messages before block + current user's messages after block
            filteredMessages = messages.filter(msg => {
                const messageDate = new Date(msg.createdAt);
                const blockDate = new Date(activeBlockInfo.createdAt);
                
                // Show messages from before block date
                if (messageDate < blockDate) {
                    return true;
                }
                
                // After block date, only show current user's messages
                return msg.sender._id.toString() === userId.toString();
            });
        } else {
            // Not currently blocked, but check for block history
            const allBlocks = await BlockedUser.find({
                blocker: userId,
                blocked: friendUserId,
            }).sort({ createdAt: -1 });
            
            if (allBlocks.length > 0) {
                // Find the most recent unblock date
                const mostRecentBlock = allBlocks[0];
                
                if (mostRecentBlock.unblockDate) {
                    // There was a previous block-unblock cycle
                    // Hide messages sent by blocked user during the blocked period
                    filteredMessages = messages.filter(msg => {
                        const messageDate = new Date(msg.createdAt);
                        const blockStartDate = new Date(mostRecentBlock.createdAt);
                        const unblockDate = new Date(mostRecentBlock.unblockDate);
                        const senderIsCurrentUser = msg.sender._id.toString() === userId.toString();
                        
                        // Always show current user's messages
                        if (senderIsCurrentUser) {
                            return true;
                        }
                        
                        // For friend's messages, hide those sent during the blocked period
                        if (messageDate >= blockStartDate && messageDate < unblockDate) {
                            return false; // Hide messages sent during blocked period
                        }
                        
                        return true; // Show all other messages
                    });
                } else {
                    // Currently blocked (shouldn't happen as we check activeBlockInfo above)
                    filteredMessages = messages;
                }
            } else {
                // No block history, show all messages
                filteredMessages = messages;
            }
        }

        const formattedMessages = filteredMessages.map((msg) => ({
            messageId: msg._id,
            message: msg.message,
            senderUserName: msg.sender.userName,
            recipientUserName: msg.recipient.userName,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
        }));
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    formattedMessages,
                    "Fetched all messages successfully"
                )
            );
    } catch (error) {
        console.error("Error while fetching messages:", error);
        throw new ApiError(500, "Internal server error");
    }
});

export {
    createMessage,
    editMessage,
    deleteMessage,
    fetchSentMessages,
    fetchReceivedMessages,
    // friendLastMessage,
    getFriendsWithLastMessage,
    fetchAllMessages,
};
