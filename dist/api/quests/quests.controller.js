"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIn = void 0;
const pool_1 = __importDefault(require("../../db/pool"));
const quest_engine_1 = require("../../services/quest/quest.engine");
const checkIn = async (req, res) => {
    const userId = req.user?.id;
    const { venueId, lat, lng } = req.body;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (!venueId || !lat || !lng) {
        res.status(400).json({ error: "Missing parameters" });
        return;
    }
    const client = await pool_1.default.connect();
    try {
        // =========================================================
        // PHASE 1: VALIDATION (Geofence & Existence & Already Checked In)
        // =========================================================
        // Check if user is already checked in at this venue
        const userCheck = await client.query(`SELECT venue_id FROM users WHERE id = $1`, [userId]);
        if (userCheck.rows[0]?.venue_id === venueId) {
            res
                .status(400)
                .json({ error: "You are already checked in at this venue" });
            return;
        }
        const venueCheck = await client.query(`
      SELECT 
        name, -- Need name for the Ledger reason
        category, 
        ST_Distance(
          location, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters
      FROM venues WHERE id = $3
      `, [lng, lat, venueId]);
        const venue = venueCheck.rows[0];
        if (!venue) {
            res.status(404).json({ error: "Venue not found" });
            return;
        }
        if (venue.distance_meters > 100) {
            res.status(403).json({
                error: `You are too far away! (${Math.round(venue.distance_meters)}m)`,
            });
            return;
        }
        // =========================================================
        // PHASE 2: PERSISTENCE (Check-In + Rewards)
        // =========================================================
        await client.query("BEGIN");
        // A. Log History (Permanent Record)
        await client.query(`
      INSERT INTO checkins (user_id, venue_id, coords, check_in_time)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), NOW())
    `, [userId, venueId, lng, lat]);
        // B. Calculate Rewards
        const xpReward = 50;
        // C. Update User State (Live View + Wallet)
        await client.query(`
      UPDATE users 
      SET venue_id = $1, 
          checked_in_at = NOW(),
          current_location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
          last_active = NOW(),
          xp = xp + $5
      WHERE id = $4
    `, [venueId, lng, lat, userId, xpReward]);
        await client.query("COMMIT");
        // =========================================================
        // PHASE 3: REACTION (The Gamification)
        // =========================================================
        const questResult = await quest_engine_1.QuestEngine.processEvent({
            userId,
            type: "LOCATION",
            data: {
                venueId,
                venueCategory: venue.category,
                lat,
                lng,
            },
        });
        // =========================================================
        // PHASE 4: RESPONSE
        // =========================================================
        res.json({
            success: true,
            venueId,
            message: `Checked into ${venue.name}! (+${xpReward} XP)`,
            questUpdates: questResult.success ? questResult.completed : [],
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("Check-in Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
    finally {
        client.release();
    }
};
exports.checkIn = checkIn;
