import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middelware.js';
import { getALLFriends,sendFriendRequest,acceptFriendRequest,rejectFriendRequest, getFriendRequests, blockUser, unblockUser, unFriend } from '../controllers/Friend.controller.js';

const router = Router();

router.route("/get-all-friends").get(verifyJWT,getALLFriends);
router.route("/send-request").post(verifyJWT,sendFriendRequest);
router.route("/accept-request").post(verifyJWT,acceptFriendRequest);
router.route("/reject-request").post(verifyJWT,rejectFriendRequest);
// router.route("/get-all-request").post(verifyJWT,getFriendRequests);
router.route("/block-user").post(verifyJWT,blockUser);
router.route("/unblock-user").post(verifyJWT,unblockUser);
router.route("/unfriend-user").post(verifyJWT,unFriend);
router.route("/get-allFriend-request").get(verifyJWT,getFriendRequests);

export default router;