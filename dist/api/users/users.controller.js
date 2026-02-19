"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.getLedgerHistory = exports.getCheckInHistory = exports.heartbeat = exports.checkout = exports.updateLocation = exports.getUserById = void 0;
const pool_1 = __importDefault(require("../../db/pool"));
const cache_service_1 = require("../../services/cache.service");
// GET /api/users/:id - Get single user by ID
const getUserById = async (req, res) => {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const id = req.params.id;
        const userId = parseInt(Array.isArray(id) ? id[0] : id);
        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }
        const client = await pool_1.default.connect();
        try {
            const query = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.xp,
          u.level,
          u.gold,
          u.venue_id,
          u.last_active,
          pm.party_id,
          p.name as party_name,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM friendships 
              WHERE ((requester_id = $2 AND addressee_id = u.id) 
                  OR (requester_id = u.id AND addressee_id = $2))
                AND status = 'ACCEPTED'
            ) THEN 'FRIENDS'
            WHEN EXISTS (
              SELECT 1 FROM friendships 
              WHERE requester_id = $2 AND addressee_id = u.id AND status = 'PENDING'
            ) THEN 'REQUEST_SENT'
            WHEN EXISTS (
              SELECT 1 FROM friendships 
              WHERE requester_id = u.id AND addressee_id = $2 AND status = 'PENDING'
            ) THEN 'REQUEST_RECEIVED'
            ELSE 'NONE'
          END as friendship_status,
          (
            SELECT f.created_at 
            FROM friendships f
            WHERE ((f.requester_id = $2 AND f.addressee_id = u.id) 
                OR (f.requester_id = u.id AND f.addressee_id = $2))
              AND f.status = 'ACCEPTED'
            LIMIT 1
          ) as friends_since
        FROM users u
        LEFT JOIN party_members pm ON u.id = pm.user_id
        LEFT JOIN parties p ON pm.party_id = p.id
        WHERE u.id = $1
      `;
            const result = await client.query(query, [userId, currentUserId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.json(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Error getting user by ID:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
};
exports.getUserById = getUserById;
const updateLocation = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        // @ts-ignore - 'user' is attached by the auth middleware
        const userId = req.user?.id;
        const { lat, lng } = req.body;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!lat || !lng) {
            res.status(400).json({ error: "Missing lat/lng" });
            return;
        }
        await client.query("BEGIN");
        // Check if user is currently checked into a venue
        const userCheck = await client.query(`SELECT venue_id FROM users WHERE id = $1`, [userId]);
        const venueId = userCheck.rows[0]?.venue_id;
        let checkedOut = false;
        if (venueId) {
            // Check distance from current venue
            const distanceCheck = await client.query(`
        SELECT 
          ST_Distance(
            location, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance_meters
        FROM venues WHERE id = $3
        `, [lng, lat, venueId]);
            const distance = distanceCheck.rows[0]?.distance_meters;
            // If user is more than 100m away, auto-checkout
            if (distance > 100) {
                await client.query(`UPDATE users SET venue_id = NULL, checked_in_at = NULL WHERE id = $1`, [userId]);
                checkedOut = true;
                // Invalidate venues cache since live_count changed
                await (0, cache_service_1.invalidatePattern)("venues:*");
            }
        }
        // Update PostGIS location and timestamp
        await client.query(`
        UPDATE users 
        SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
            last_active = NOW()
        WHERE id = $3
      `, [lng, lat, userId]);
        await client.query("COMMIT");
        res.json({
            success: true,
            message: "Location updated successfully",
            checkedOut,
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Update Location Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    finally {
        client.release();
    }
};
exports.updateLocation = updateLocation;
// POST /api/users/checkout - Manual checkout from venue
const checkout = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        await client.query("BEGIN");
        // Check if user is currently checked in
        const userCheck = await client.query(`SELECT venue_id FROM users WHERE id = $1`, [userId]);
        if (!userCheck.rows[0]?.venue_id) {
            res.status(400).json({ error: "Not currently checked in" });
            return;
        }
        // Clear venue_id
        await client.query(`UPDATE users SET venue_id = NULL, checked_in_at = NULL WHERE id = $1`, [userId]);
        await client.query("COMMIT");
        // Invalidate venues cache since live_count changed
        await (0, cache_service_1.invalidatePattern)("venues:*");
        res.json({
            success: true,
            message: "Checked out successfully",
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Checkout Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    finally {
        client.release();
    }
};
exports.checkout = checkout;
// POST /api/users/heartbeat - Update last_active timestamp
const heartbeat = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        await pool_1.default.query(`UPDATE users SET last_active = NOW() WHERE id = $1`, [
            userId,
        ]);
        res.json({ success: true });
    }
    catch (err) {
        console.error("Heartbeat Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.heartbeat = heartbeat;
// GET /api/users/history
const getCheckInHistory = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        // Fetch last 10 check-ins with Venue Name and Time
        const query = `
      SELECT 
        c.id,
        v.name as venue_name,
        v.category,
        c.check_in_time
      FROM checkins c
      JOIN venues v ON c.venue_id = v.id
      WHERE c.user_id = $1
      ORDER BY c.check_in_time DESC
      LIMIT 10;
    `;
        const result = await pool_1.default.query(query, [userId]);
        res.json({ history: result.rows });
    }
    catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};
exports.getCheckInHistory = getCheckInHistory;
// GET /api/users/ledger
const getLedgerHistory = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        // Fetch last 10 GOLD transactions
        const query = `
      SELECT id, amount, reason, created_at
      FROM ledger 
      WHERE user_id = $1 AND currency = 'GOLD'
      ORDER BY created_at DESC 
      LIMIT 10
    `;
        const result = await pool_1.default.query(query, [userId]);
        res.json({ ledger: result.rows });
    }
    catch (err) {
        console.error("Ledger Error:", err);
        res.status(500).json({ error: "Failed to fetch ledger" });
    }
};
exports.getLedgerHistory = getLedgerHistory;
// Get all users (paginated) with optional search and friendship status
const getUsers = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";
        const client = await pool_1.default.connect();
        try {
            // Build dynamic query parts for data query
            let dataWhereClauses = [`u.id != $3`]; // Exclude self
            let dataQueryParams = [limit, offset, userId];
            let dataParamIndex = 4;
            // Build separate params for count query
            let countWhereClauses = [`u.id != $1`]; // Exclude self
            let countQueryParams = [userId];
            let countParamIndex = 2;
            // Add search filter
            if (search) {
                dataWhereClauses.push(`(u.username ILIKE $${dataParamIndex} OR u.email ILIKE $${dataParamIndex})`);
                dataQueryParams.push(`%${search}%`);
                dataParamIndex++;
                countWhereClauses.push(`(u.username ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`);
                countQueryParams.push(`%${search}%`);
                countParamIndex++;
            }
            const dataWhereClause = `WHERE ${dataWhereClauses.join(" AND ")}`;
            const countWhereClause = `WHERE ${countWhereClauses.join(" AND ")}`;
            // 1. Data Query (The Page)
            const dataQuery = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.xp,
          u.level,
          u.gold,
          u.venue_id,
          u.last_active,
          pm.party_id,
          p.name as party_name,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM friendships 
              WHERE ((requester_id = $3 AND addressee_id = u.id) 
                  OR (requester_id = u.id AND addressee_id = $3))
                AND status = 'ACCEPTED'
            ) THEN 'FRIENDS'
            WHEN EXISTS (
              SELECT 1 FROM friendships 
              WHERE requester_id = $3 AND addressee_id = u.id AND status = 'PENDING'
            ) THEN 'REQUEST_SENT'
            WHEN EXISTS (
              SELECT 1 FROM friendships 
              WHERE requester_id = u.id AND addressee_id = $3 AND status = 'PENDING'
            ) THEN 'REQUEST_RECEIVED'
            ELSE 'NONE'
          END as friendship_status,
          (
            SELECT f.created_at 
            FROM friendships f
            WHERE ((f.requester_id = $3 AND f.addressee_id = u.id) 
                OR (f.requester_id = u.id AND f.addressee_id = $3))
              AND f.status = 'ACCEPTED'
            LIMIT 1
          ) as friends_since
        FROM users u
        LEFT JOIN party_members pm ON u.id = pm.user_id
        LEFT JOIN parties p ON pm.party_id = p.id
        ${dataWhereClause}
        ORDER BY u.username ASC
        LIMIT $1 OFFSET $2
      `;
            // 2. Count Query (The Total)
            const countQuery = `SELECT COUNT(*) FROM users u ${countWhereClause}`;
            // Run both in parallel for speed
            const [dataRes, countRes] = await Promise.all([
                client.query(dataQuery, dataQueryParams),
                client.query(countQuery, countQueryParams),
            ]);
            const total = parseInt(countRes.rows[0].count);
            // 3. Return Full Meta Data
            res.json({
                data: dataRes.rows,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error("Error getting users:", error);
        res.status(500).json({ error: "Failed to get users" });
    }
};
exports.getUsers = getUsers;
