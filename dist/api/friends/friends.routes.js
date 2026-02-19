"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const friends_controller_1 = require("./friends.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Get friends list (with optional search filter)
router.get("/", friends_controller_1.getFriends);
// Get pending friend requests
router.get("/requests", friends_controller_1.getPendingRequests);
// Send friend request
router.post("/request", friends_controller_1.sendFriendRequest);
// Accept friend request
router.post("/:friendshipId/accept", friends_controller_1.acceptFriendRequest);
// Reject friend request
router.post("/:friendshipId/reject", friends_controller_1.rejectFriendRequest);
// Remove friend
router.delete("/:friendshipId", friends_controller_1.removeFriend);
exports.default = router;
