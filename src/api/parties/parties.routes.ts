import { Router } from "express";
import { authenticateToken } from "@/middleware/auth.middleware";
import {
  getParty,
  createParty,
  joinParty,
  leaveParty,
  deleteParty,
  kickUser,
  inviteUser,
  acceptInvite,
  rejectInvite,
  getMyInvites,
  requestToJoin,
  acceptJoinRequest,
  rejectJoinRequest,
  getPartyRequests,
} from "@/api/parties/parties.controller";
const router = Router();

// All party routes require authentication
router.use(authenticateToken);

// Specific routes must come BEFORE parameter routes
router.post("/", createParty);
router.post("/join", joinParty);
router.post("/leave", leaveParty);
router.post("/delete", deleteParty);
router.post("/kick", kickUser);

// Party invites (leader -> user)
router.post("/invite", inviteUser);
router.post("/invite/:inviteId/accept", acceptInvite);
router.post("/invite/:inviteId/reject", rejectInvite);
router.get("/invites", getMyInvites);

// Join requests (user -> party)
router.post("/request", requestToJoin);
router.post("/request/:requestId/accept", acceptJoinRequest);
router.post("/request/:requestId/reject", rejectJoinRequest);

// Parameter routes must come LAST to avoid conflicts
router.get("/:partyId", getParty);
router.get("/:partyId/requests", getPartyRequests);

export default router;
