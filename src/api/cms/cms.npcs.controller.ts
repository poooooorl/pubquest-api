import { Request, Response } from "express";
import pool from "@/db/pool";

/**
 * CMS Controller for NPC Management
 * CRUD operations for the admin panel
 */

/**
 * GET /api/cms/npcs
 * List all NPCs
 */
export const getAllNPCs = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        n.id,
        n.name,
        n.description,
        n.avatar_url,
        n.venue_id,
        v.name as venue_name,
        n.is_quest_giver,
        n.greeting_text,
        COUNT(nq.id) as quest_count,
        n.created_at
      FROM npcs n
      LEFT JOIN venues v ON n.venue_id = v.id
      LEFT JOIN npc_quests nq ON n.id = nq.npc_id
      GROUP BY n.id, v.name
      ORDER BY n.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching NPCs:", err);
    res.status(500).json({ error: "Failed to fetch NPCs" });
  } finally {
    client.release();
  }
};

/**
 * GET /api/cms/npcs/:id
 * Get detailed NPC for editing
 */
export const getNPCById = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const npcId = parseInt(req.params.id as string);

    // Get NPC details
    const npcResult = await client.query(
      `SELECT 
        n.*,
        ST_Y(n.location::geometry) as latitude,
        ST_X(n.location::geometry) as longitude
       FROM npcs n 
       WHERE n.id = $1`,
      [npcId],
    );

    if (npcResult.rows.length === 0) {
      return res.status(404).json({ error: "NPC not found" });
    }

    // Get associated quests
    const questsResult = await client.query(
      `SELECT 
        nq.id as npc_quest_id,
        nq.is_repeatable,
        nq.level_requirement,
        q.id as quest_id,
        q.title as quest_title
       FROM npc_quests nq
       JOIN quests q ON nq.quest_id = q.id
       WHERE nq.npc_id = $1`,
      [npcId],
    );

    const npc = {
      ...npcResult.rows[0],
      quests: questsResult.rows,
    };

    res.json(npc);
  } catch (err) {
    console.error("Error fetching NPC:", err);
    res.status(500).json({ error: "Failed to fetch NPC" });
  } finally {
    client.release();
  }
};

/**
 * POST /api/cms/npcs
 * Create new NPC
 */
export const createNPC = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      name,
      description,
      avatar_url,
      venue_id,
      latitude,
      longitude,
      is_quest_giver,
      greeting_text,
      dialogue_tree,
    } = req.body;

    // Build location from lat/lng if provided
    let locationSQL: string | null = null;
    if (latitude && longitude) {
      locationSQL = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
    }

    const result = await client.query(
      `INSERT INTO npcs (
        name, description, avatar_url, venue_id, location, 
        is_quest_giver, greeting_text, dialogue_tree
      ) VALUES ($1, $2, $3, $4, ${locationSQL || "NULL"}, $5, $6, $7)
      RETURNING *`,
      [
        name,
        description || null,
        avatar_url || null,
        venue_id || null,
        is_quest_giver ?? true,
        greeting_text || "Greetings, traveler!",
        dialogue_tree ? JSON.stringify(dialogue_tree) : null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating NPC:", err);
    res.status(500).json({ error: "Failed to create NPC" });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/cms/npcs/:id
 * Update existing NPC
 */
export const updateNPC = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const npcId = parseInt(req.params.id as string);
    const {
      name,
      description,
      avatar_url,
      venue_id,
      latitude,
      longitude,
      is_quest_giver,
      greeting_text,
      dialogue_tree,
    } = req.body;

    // Build location from lat/lng if provided
    let locationSQL = "location"; // Keep existing if not provided
    if (latitude !== undefined && longitude !== undefined) {
      if (latitude && longitude) {
        locationSQL = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
      } else {
        locationSQL = "NULL";
      }
    }

    const result = await client.query(
      `UPDATE npcs SET 
        name = $1,
        description = $2,
        avatar_url = $3,
        venue_id = $4,
        location = ${locationSQL},
        is_quest_giver = $5,
        greeting_text = $6,
        dialogue_tree = $7
      WHERE id = $8
      RETURNING *`,
      [
        name,
        description,
        avatar_url,
        venue_id,
        is_quest_giver,
        greeting_text,
        dialogue_tree ? JSON.stringify(dialogue_tree) : null,
        npcId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NPC not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating NPC:", err);
    res.status(500).json({ error: "Failed to update NPC" });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/cms/npcs/:id
 * Delete NPC
 */
export const deleteNPC = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const npcId = parseInt(req.params.id as string);

    // Check if NPC is referenced in quests as giver/turn-in
    const inUseCheck = await client.query(
      `SELECT COUNT(*) as count 
       FROM quests 
       WHERE giver_npc_id = $1 OR turn_in_npc_id = $1`,
      [npcId],
    );

    if (parseInt(inUseCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete NPC that is referenced in quests",
        in_use: true,
      });
    }

    await client.query(`DELETE FROM npcs WHERE id = $1`, [npcId]);
    res.json({ message: "NPC deleted successfully", id: npcId });
  } catch (err) {
    console.error("Error deleting NPC:", err);
    res.status(500).json({ error: "Failed to delete NPC" });
  } finally {
    client.release();
  }
};

/**
 * POST /api/cms/npcs/:id/quests
 * Assign quest to NPC
 */
export const assignQuestToNPC = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const npcId = parseInt(req.params.id as string);
    const { quest_id, is_repeatable, level_requirement } = req.body;

    const result = await client.query(
      `INSERT INTO npc_quests (npc_id, quest_id, is_repeatable, level_requirement)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (npc_id, quest_id) DO UPDATE
       SET is_repeatable = $3, level_requirement = $4
       RETURNING *`,
      [npcId, quest_id, is_repeatable ?? false, level_requirement ?? 1],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error assigning quest to NPC:", err);
    res.status(500).json({ error: "Failed to assign quest" });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/cms/npcs/:npcId/quests/:questId
 * Remove quest from NPC
 */
export const removeQuestFromNPC = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const npcId = parseInt(req.params.npcId as string);
    const questId = parseInt(req.params.questId as string);

    await client.query(
      `DELETE FROM npc_quests WHERE npc_id = $1 AND quest_id = $2`,
      [npcId, questId],
    );

    res.json({ message: "Quest removed from NPC successfully" });
  } catch (err) {
    console.error("Error removing quest from NPC:", err);
    res.status(500).json({ error: "Failed to remove quest" });
  } finally {
    client.release();
  }
};
