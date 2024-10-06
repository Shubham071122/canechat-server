import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middelware.js";
import { createMessage, deleteMessage, editMessage, fetchAllMessages, fetchReceivedMessages, fetchSentMessages, getFriendsWithLastMessage } from "../controllers/Message.controller.js";

const router = Router();
router.use(verifyJWT);

router.route('/c/message').post(createMessage);
router.route('/d/message').delete(deleteMessage);
router.route('/e/message').patch(editMessage);
router.route('/f/sent').get(fetchSentMessages);
router.route('/f/recieved').get(fetchReceivedMessages);
// router.route('/friends-with-last-message').get(friendLastMessage);
router.route('/friends-with-last-message').get(getFriendsWithLastMessage);
router.route('/all-message').post(fetchAllMessages);

export default router;