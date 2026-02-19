import { Request, Response } from "express";
import { QuestEngine } from "@/services/quest/quest.engine";
import pool from "@/db/pool";

export const handleTransactionWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, merchantName, amountCents } = req.body;

    // 1. Resolve Venue ID (Normalize "The Rusty Spoon" -> ID 1)
    const venueRes = await pool.query(
      `SELECT id FROM venues WHERE name ILIKE $1`,
      [merchantName],
    );

    if (venueRes.rows.length === 0) {
      res.json({ status: "ignored", reason: "unknown_merchant" });
      return;
    }

    const venueId = venueRes.rows[0].id;

    // 2. DELEGATE TO ENGINE
    const result = await QuestEngine.processEvent({
      userId,
      type: "SPEND",
      data: { venueId, amountCents },
    });

    res.json({
      status: "processed",
      objectives_completed: result.completed?.length || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Webhook Error" });
  }
};
