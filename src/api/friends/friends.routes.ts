import { Router } from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  removeFriend,
} from "./friends.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get friends list (with optional search filter)
router.get("/", getFriends);

// Get pending friend requests
router.get("/requests", getPendingRequests);

// Send friend request
router.post("/request", sendFriendRequest);

// Accept friend request
router.post("/:friendshipId/accept", acceptFriendRequest);

// Reject friend request
router.post("/:friendshipId/reject", rejectFriendRequest);

// Remove friend
router.delete("/:friendshipId", removeFriend);

export default router;
