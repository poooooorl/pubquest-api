"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTransactionWebhook = void 0;
const quest_engine_1 = require("../../services/quest/quest.engine");
const pool_1 = __importDefault(require("../../db/pool"));
const handleTransactionWebhook = async (req, res) => {
    try {
        const { userId, merchantName, amountCents } = req.body;
        // 1. Resolve Venue ID (Normalize "The Rusty Spoon" -> ID 1)
        const venueRes = await pool_1.default.query(`SELECT id FROM venues WHERE name ILIKE $1`, [merchantName]);
        if (venueRes.rows.length === 0) {
            res.json({ status: "ignored", reason: "unknown_merchant" });
            return;
        }
        const venueId = venueRes.rows[0].id;
        // 2. DELEGATE TO ENGINE
        const result = await quest_engine_1.QuestEngine.processEvent({
            userId,
            type: "SPEND",
            data: { venueId, amountCents },
        });
        res.json({
            status: "processed",
            objectives_completed: result.completed?.length || 0,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Webhook Error" });
    }
};
exports.handleTransactionWebhook = handleTransactionWebhook;
