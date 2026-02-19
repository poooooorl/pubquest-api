"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const parties_controller_1 = require("../../api/parties/parties.controller");
const router = (0, express_1.Router)();
// All party routes require authentication
router.use(auth_middleware_1.authenticateToken);
// Specific routes must come BEFORE parameter routes
router.post("/", parties_controller_1.createParty);
router.post("/join", parties_controller_1.joinParty);
router.post("/leave", parties_controller_1.leaveParty);
router.post("/delete", parties_controller_1.deleteParty);
router.post("/kick", parties_controller_1.kickUser);
// Party invites (leader -> user)
router.post("/invite", parties_controller_1.inviteUser);
router.post("/invite/:inviteId/accept", parties_controller_1.acceptInvite);
router.post("/invite/:inviteId/reject", parties_controller_1.rejectInvite);
router.get("/invites", parties_controller_1.getMyInvites);
// Join requests (user -> party)
router.post("/request", parties_controller_1.requestToJoin);
router.post("/request/:requestId/accept", parties_controller_1.acceptJoinRequest);
router.post("/request/:requestId/reject", parties_controller_1.rejectJoinRequest);
// Parameter routes must come LAST to avoid conflicts
router.get("/:partyId", parties_controller_1.getParty);
router.get("/:partyId/requests", parties_controller_1.getPartyRequests);
exports.default = router;
