import { Router } from 'express';
import {upload} from '../middlewares/multer.middelware.js'
import { verifyJWT } from '../middlewares/auth.middelware.js';
import { changeCurrentPassword, deleteAccount, forgetPassword, getCurrentUser, getUserById, loginUser, logoutUser, refreshAccessToken, registerUser, resetPassword, searchUser, updateAccountDetails, updateUserAvatar } from '../controllers/User.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1,
    },
]),registerUser);
router.route("/login").post(loginUser);
router.route("/forgot-password").post(forgetPassword);
router.route("/reset-password").post(resetPassword);
router.get('/check-auth', verifyJWT, asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    res.status(200).json({
        success: true,
        user: req.user,
    });
}));
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/u/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/u/:userId").get(verifyJWT,getUserById);
router.route("/delete-account").post(verifyJWT,deleteAccount)
router.route("/search-users").get(verifyJWT,searchUser);


export default router;
