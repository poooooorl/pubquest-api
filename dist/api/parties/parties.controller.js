"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPartyRequests = exports.rejectJoinRequest = exports.acceptJoinRequest = exports.requestToJoin = exports.getMyInvites = exports.rejectInvite = exports.acceptInvite = exports.inviteUser = exports.kickUser = exports.deleteParty = exports.leaveParty = exports.joinParty = exports.createParty = exports.getParty = void 0;
const pool_1 = __importDefault(require("../../db/pool"));
// GET /api/parties/:partyId
const getParty = async (req, res) => {
    try {
        const { partyId } = req.params;
        const partyRes = await pool_1.default.query(`SELECT 
        p.id,
        p.name,
        p.invite_code,
        p.leader_id,
        p.created_at
      FROM parties p
      WHERE p.id = $1`, [partyId]);
        if (partyRes.rows.length === 0) {
            res.status(404).json({ error: "Party not found" });
            return;
        }
        const party = partyRes.rows[0];
        // Get party members
        const membersRes = await pool_1.default.query(`SELECT 
        u.id as user_id,
        u.username,
        u.level,
        u.last_active,
        pm.joined_at,
        (u.id = p.leader_id) as is_leader,
        ST_Y(u.current_location::geometry) as lat,
        ST_X(u.current_location::geometry) as lng
      FROM party_members pm
      JOIN users u ON pm.user_id = u.id
      JOIN parties p ON pm.party_id = p.id
      WHERE pm.party_id = $1
      ORDER BY is_leader DESC, pm.joined_at ASC`, [partyId]);
        res.json({
            ...party,
            members: membersRes.rows,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch party" });
    }
};
exports.getParty = getParty;
// POST /api/parties
const createParty = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        const userId = req.user?.id;
        const { name } = req.body;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!name) {
            res.status(400).json({ error: "Party name is required" });
            return;
        }
        // Check if user is already in a party
        const existingParty = await client.query(`SELECT party_id FROM party_members WHERE user_id = $1`, [userId]);
        if (existingParty.rows.length > 0) {
            res.status(400).json({
                error: "You are already in a party. Leave your current party first.",
            });
            return;
        }
        // Generate a simple 6-char code (e.g., "X7K9P2")
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await client.query("BEGIN");
        // 1. Create Party
        const partyRes = await client.query(`
            INSERT INTO parties (name, leader_id, invite_code)
            VALUES ($1, $2, $3)
            RETURNING id, invite_code
        `, [name, userId, inviteCode]);
        const partyId = partyRes.rows[0].id;
        // 2. Add Leader as Member
        await client.query(`
            INSERT INTO party_members (party_id, user_id)
            VALUES ($1, $2)
        `, [partyId, userId]);
        await client.query("COMMIT");
        // Return full party details with members
        const partyDetailsRes = await client.query(`SELECT 
        p.id,
        p.name,
        p.invite_code,
        p.leader_id,
        p.created_at
      FROM parties p
      WHERE p.id = $1`, [partyId]);
        const membersRes = await client.query(`SELECT 
        u.id as user_id,
        u.username,
        pm.joined_at,
        (u.id = p.leader_id) as is_leader
      FROM party_members pm
      JOIN users u ON pm.user_id = u.id
      JOIN parties p ON pm.party_id = p.id
      WHERE pm.party_id = $1
      ORDER BY is_leader DESC, pm.joined_at ASC`, [partyId]);
        res.json({
            success: true,
            party: {
                ...partyDetailsRes.rows[0],
                members: membersRes.rows,
            },
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Failed to create party" });
    }
    finally {
        client.release();
    }
};
exports.createParty = createParty;
// POST /api/parties/join
const joinParty = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { inviteCode } = req.body;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // 0. Check if user is already in a party
        const existingParty = await pool_1.default.query(`SELECT party_id FROM party_members WHERE user_id = $1`, [userId]);
        if (existingParty.rows.length > 0) {
            res.status(400).json({
                error: "You are already in a party. Leave your current party first.",
            });
            return;
        }
        // 1. Find Party by Code
        const partyRes = await pool_1.default.query(`SELECT id, name FROM parties WHERE invite_code = $1`, [inviteCode]);
        if (partyRes.rows.length === 0) {
            res.status(404).json({ error: "Invalid Invite Code" });
            return;
        }
        const party = partyRes.rows[0];
        // 2. Add Member
        await pool_1.default.query(`
            INSERT INTO party_members (party_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [party.id, userId]);
        res.json({ success: true, partyName: party.name, partyId: party.id });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to join party" });
    }
};
exports.joinParty = joinParty;
// POST /api/parties/leave
const leaveParty = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // 1. Find the party they are in (so we can return the ID)
        const findRes = await pool_1.default.query(`
            SELECT party_id FROM party_members WHERE user_id = $1
        `, [userId]);
        if (findRes.rows.length === 0) {
            res.status(400).json({ error: "User is not in a party" });
            return;
        }
        const partyId = findRes.rows[0].party_id;
        // 2. Remove them
        await pool_1.default.query(`
            DELETE FROM party_members WHERE user_id = $1
        `, [userId]);
        // (Optional: If the party is now empty, you might want to delete the party row too)
        res.json({ success: true, message: "Left party", partyId });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to leave party" });
    }
};
exports.leaveParty = leaveParty;
// POST /api/parties/delete
const deleteParty = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        const userId = req.user?.id;
        const { partyId } = req.body;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!partyId) {
            res.status(400).json({ error: "partyId is required" });
            return;
        }
        // 1. Check if the user is the party leader
        const partyRes = await client.query(`SELECT id, leader_id, name FROM parties WHERE id = $1`, [partyId]);
        if (partyRes.rows.length === 0) {
            res.status(404).json({ error: "Party not found" });
            return;
        }
        const party = partyRes.rows[0];
        if (party.leader_id !== userId) {
            res
                .status(403)
                .json({ error: "Only the party leader can delete the party" });
            return;
        }
        await client.query("BEGIN");
        // 2. Delete all party members (CASCADE should handle this, but being explicit)
        await client.query(`DELETE FROM party_members WHERE party_id = $1`, [
            partyId,
        ]);
        // 3. Delete the party
        await client.query(`DELETE FROM parties WHERE id = $1`, [partyId]);
        await client.query("COMMIT");
        res.json({ success: true, message: "Party deleted" });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Failed to delete party" });
    }
    finally {
        client.release();
    }
};
exports.deleteParty = deleteParty;
// POST /api/parties/kick
const kickUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { partyId, targetUserId } = req.body;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!partyId || !targetUserId) {
            res.status(400).json({ error: "partyId and targetUserId are required" });
            return;
        }
        // 1. Check if the user is the party leader
        const partyRes = await pool_1.default.query(`SELECT id, leader_id, name FROM parties WHERE id = $1`, [partyId]);
        if (partyRes.rows.length === 0) {
            res.status(404).json({ error: "Party not found" });
            return;
        }
        const party = partyRes.rows[0];
        if (party.leader_id !== userId) {
            res.status(403).json({ error: "Only the party leader can kick members" });
            return;
        }
        // 2. Cannot kick yourself (use disband or leave instead)
        if (targetUserId === userId) {
            res
                .status(400)
                .json({ error: "Cannot kick yourself. Use leave or disband instead." });
            return;
        }
        // 3. Check if target user is in the party
        const memberRes = await pool_1.default.query(`SELECT id FROM party_members WHERE party_id = $1 AND user_id = $2`, [partyId, targetUserId]);
        if (memberRes.rows.length === 0) {
            res.status(404).json({ error: "User is not in this party" });
            return;
        }
        // 4. Remove the user from the party
        await pool_1.default.query(`DELETE FROM party_members WHERE party_id = $1 AND user_id = $2`, [partyId, targetUserId]);
        res.json({ success: true, message: "User kicked from party" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to kick user" });
    }
};
exports.kickUser = kickUser;
// POST /api/parties/invite
const inviteUser = async (req, res) => {
    try {
        const { userId, partyId, inviteeId } = req.body;
        if (!userId || !partyId || !inviteeId) {
            res
                .status(400)
                .json({ error: "userId, partyId, and inviteeId are required" });
            return;
        }
        // 1. Check if the user is the party leader
        const partyRes = await pool_1.default.query(`SELECT id, leader_id, name FROM parties WHERE id = $1`, [partyId]);
        if (partyRes.rows.length === 0) {
            res.status(404).json({ error: "Party not found" });
            return;
        }
        const party = partyRes.rows[0];
        if (party.leader_id !== userId) {
            res.status(403).json({ error: "Only the party leader can invite users" });
            return;
        }
        // 2. Check if invitee exists
        const inviteeRes = await pool_1.default.query(`SELECT id FROM users WHERE id = $1`, [
            inviteeId,
        ]);
        if (inviteeRes.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // 3. Check if invitee is already in a party
        const inParty = await pool_1.default.query(`SELECT party_id FROM party_members WHERE user_id = $1`, [inviteeId]);
        if (inParty.rows.length > 0) {
            res.status(400).json({ error: "User is already in a party" });
            return;
        }
        // 4. Create invite
        const inviteRes = await pool_1.default.query(`INSERT INTO party_invites (party_id, inviter_id, invitee_id, status)
       VALUES ($1, $2, $3, 'PENDING')
       ON CONFLICT (party_id, invitee_id) DO NOTHING
       RETURNING *`, [partyId, userId, inviteeId]);
        if (inviteRes.rows.length === 0) {
            res.status(400).json({ error: "Invite already exists" });
            return;
        }
        res.json({ success: true, invite: inviteRes.rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send invite" });
    }
};
exports.inviteUser = inviteUser;
// POST /api/parties/invite/:inviteId/accept
const acceptInvite = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        const userId = req.user?.id;
        const { inviteId } = req.params;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!userId || !inviteId) {
            res.status(400).json({ error: "userId and inviteId are required" });
            return;
        }
        await client.query("BEGIN");
        // 1. Get the invite
        const inviteRes = await client.query(`SELECT * FROM party_invites WHERE id = $1 AND invitee_id = $2 AND status = 'PENDING'`, [inviteId, userId]);
        if (inviteRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Invite not found or already processed" });
            return;
        }
        const invite = inviteRes.rows[0];
        // 2. Check if user is already in a party
        const inParty = await client.query(`SELECT party_id FROM party_members WHERE user_id = $1`, [userId]);
        if (inParty.rows.length > 0) {
            await client.query("ROLLBACK");
            res.status(400).json({ error: "You are already in a party" });
            return;
        }
        // 3. Add user to party
        await client.query(`INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)`, [invite.party_id, userId]);
        // 4. Update invite status
        await client.query(`UPDATE party_invites SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1`, [inviteId]);
        await client.query("COMMIT");
        res.json({
            success: true,
            message: "Invite accepted",
            partyId: invite.party_id,
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Failed to accept invite" });
    }
    finally {
        client.release();
    }
};
exports.acceptInvite = acceptInvite;
// POST /api/parties/invite/:inviteId/reject
const rejectInvite = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { inviteId } = req.params;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!userId || !inviteId) {
            res.status(400).json({ error: "userId and inviteId are required" });
            return;
        }
        // 1. Check invite exists and belongs to user
        const inviteRes = await pool_1.default.query(`SELECT * FROM party_invites WHERE id = $1 AND invitee_id = $2 AND status = 'PENDING'`, [inviteId, userId]);
        if (inviteRes.rows.length === 0) {
            res.status(404).json({ error: "Invite not found or already processed" });
            return;
        }
        // 2. Update invite status
        await pool_1.default.query(`UPDATE party_invites SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`, [inviteId]);
        res.json({ success: true, message: "Invite rejected" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to reject invite" });
    }
};
exports.rejectInvite = rejectInvite;
// GET /api/parties/invites
const getMyInvites = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // Get invites received by this user
        const receivedInvites = await pool_1.default.query(`SELECT 
        pi.id, pi.party_id, pi.status, pi.created_at,
        p.name as party_name,
        u.username as inviter_username
       FROM party_invites pi
       JOIN parties p ON pi.party_id = p.id
       JOIN users u ON pi.inviter_id = u.id
       WHERE pi.invitee_id = $1 AND pi.status = 'PENDING'
       ORDER BY pi.created_at DESC`, [userId]);
        // Get invites sent by this user
        const sentInvites = await pool_1.default.query(`SELECT 
        pi.id, pi.party_id, pi.status, pi.created_at,
        p.name as party_name,
        u.username as invitee_username
       FROM party_invites pi
       JOIN parties p ON pi.party_id = p.id
       JOIN users u ON pi.invitee_id = u.id
       WHERE pi.inviter_id = $1 AND pi.status = 'PENDING'
       ORDER BY pi.created_at DESC`, [userId]);
        res.json({
            received: receivedInvites.rows,
            sent: sentInvites.rows,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch invites" });
    }
};
exports.getMyInvites = getMyInvites;
// POST /api/parties/request
const requestToJoin = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { partyId } = req.body;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!partyId) {
            res.status(400).json({ error: "partyId is required" });
            return;
        }
        // 1. Check if party exists
        const partyRes = await pool_1.default.query(`SELECT id, name FROM parties WHERE id = $1`, [partyId]);
        if (partyRes.rows.length === 0) {
            res.status(404).json({ error: "Party not found" });
            return;
        }
        // 2. Check if user is already in a party
        const inParty = await pool_1.default.query(`SELECT party_id FROM party_members WHERE user_id = $1`, [userId]);
        if (inParty.rows.length > 0) {
            res.status(400).json({ error: "You are already in a party" });
            return;
        }
        // 3. Create join request
        const requestRes = await pool_1.default.query(`INSERT INTO party_join_requests (party_id, user_id, status)
       VALUES ($1, $2, 'PENDING')
       ON CONFLICT (party_id, user_id) DO NOTHING
       RETURNING *`, [partyId, userId]);
        if (requestRes.rows.length === 0) {
            res.status(400).json({ error: "Join request already exists" });
            return;
        }
        res.json({ success: true, request: requestRes.rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send join request" });
    }
};
exports.requestToJoin = requestToJoin;
// POST /api/parties/request/:requestId/accept
const acceptJoinRequest = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        const userId = req.user?.id;
        const { requestId } = req.params;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!userId || !requestId) {
            res.status(400).json({ error: "userId and requestId are required" });
            return;
        }
        await client.query("BEGIN");
        // 1. Get the request
        const requestRes = await client.query(`SELECT * FROM party_join_requests WHERE id = $1 AND status = 'PENDING'`, [requestId]);
        if (requestRes.rows.length === 0) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "Request not found or already processed" });
            return;
        }
        const request = requestRes.rows[0];
        // 2. Check if the user is the party leader
        const partyRes = await client.query(`SELECT leader_id FROM parties WHERE id = $1`, [request.party_id]);
        if (partyRes.rows.length === 0 || partyRes.rows[0].leader_id !== userId) {
            await client.query("ROLLBACK");
            res
                .status(403)
                .json({ error: "Only the party leader can accept join requests" });
            return;
        }
        // 3. Check if requester is already in a party
        const inParty = await client.query(`SELECT party_id FROM party_members WHERE user_id = $1`, [request.user_id]);
        if (inParty.rows.length > 0) {
            await client.query("ROLLBACK");
            res.status(400).json({ error: "User is already in a party" });
            return;
        }
        // 4. Add user to party
        await client.query(`INSERT INTO party_members (party_id, user_id) VALUES ($1, $2)`, [request.party_id, request.user_id]);
        // 5. Update request status
        await client.query(`UPDATE party_join_requests SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1`, [requestId]);
        await client.query("COMMIT");
        res.json({ success: true, message: "Join request accepted" });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Failed to accept join request" });
    }
    finally {
        client.release();
    }
};
exports.acceptJoinRequest = acceptJoinRequest;
// POST /api/parties/request/:requestId/reject
const rejectJoinRequest = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { requestId } = req.params;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!userId || !requestId) {
            res.status(400).json({ error: "userId and requestId are required" });
            return;
        }
        // 1. Get the request
        const requestRes = await pool_1.default.query(`SELECT * FROM party_join_requests WHERE id = $1 AND status = 'PENDING'`, [requestId]);
        if (requestRes.rows.length === 0) {
            res.status(404).json({ error: "Request not found or already processed" });
            return;
        }
        const request = requestRes.rows[0];
        // 2. Check if the user is the party leader
        const partyRes = await pool_1.default.query(`SELECT leader_id FROM parties WHERE id = $1`, [request.party_id]);
        if (partyRes.rows.length === 0 || partyRes.rows[0].leader_id !== userId) {
            res
                .status(403)
                .json({ error: "Only the party leader can reject join requests" });
            return;
        }
        // 3. Update request status
        await pool_1.default.query(`UPDATE party_join_requests SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`, [requestId]);
        res.json({ success: true, message: "Join request rejected" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to reject join request" });
    }
};
exports.rejectJoinRequest = rejectJoinRequest;
// GET /api/parties/:partyId/requests
const getPartyRequests = async (req, res) => {
    try {
        const { partyId } = req.params;
        const { userId } = req.query;
        if (!userId || !partyId) {
            res.status(400).json({ error: "userId and partyId are required" });
            return;
        }
        // Check if user is the party leader
        const partyRes = await pool_1.default.query(`SELECT leader_id FROM parties WHERE id = $1`, [partyId]);
        if (partyRes.rows.length === 0 ||
            partyRes.rows[0].leader_id !== parseInt(userId)) {
            res
                .status(403)
                .json({ error: "Only the party leader can view join requests" });
            return;
        }
        const requests = await pool_1.default.query(`SELECT 
        pjr.id, pjr.user_id, pjr.status, pjr.created_at,
        u.username, u.xp
       FROM party_join_requests pjr
       JOIN users u ON pjr.user_id = u.id
       WHERE pjr.party_id = $1 AND pjr.status = 'PENDING'
       ORDER BY pjr.created_at DESC`, [partyId]);
        res.json({ requests: requests.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
};
exports.getPartyRequests = getPartyRequests;
