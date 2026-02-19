import { Request, Response } from "express";
import pool from "@/db/pool";
import { AuthRequest } from "@/middleware/auth.middleware";

interface DialogueNode {
  text: string;
  options?: Array<{
    text: string;
    next: string;
  }>;
  show_quests?: boolean;
  quest_title?: string;
  check_quest?: string;
  if_active?: string;
  if_no_work?: string | Record<string, string>; // Can be a single node or quest-specific mapping
  end?: boolean;
}

interface DialogueTree {
  [key: string]: DialogueNode;
}

/**
 * Get all NPCs (optionally filtered by proximity to user or venue)
 */
export const getNPCs = async (req: AuthRequest, res: Response) => {
  try {
    const { venue_id, lat, lng, radius } = req.query;
    const userId = req.user?.id;

    let query = `
      SELECT 
        n.id,
        n.name,
        n.description,
        n.avatar_url,
        n.venue_id,
        n.is_quest_giver,
        n.greeting_text,
        n.dialogue_tree,
        v.name as venue_name,
        ST_Y(n.location::geometry) as lat,
        ST_X(n.location::geometry) as lng,
        COUNT(DISTINCT nq.quest_id) as available_quests_count
      FROM npcs n
      LEFT JOIN venues v ON n.venue_id = v.id
      LEFT JOIN npc_quests nq ON n.id = nq.npc_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by venue
    if (venue_id) {
      conditions.push(`n.venue_id = $${paramIndex}`);
      params.push(venue_id);
      paramIndex++;
    }

    // Filter by proximity
    if (lat && lng && radius) {
      conditions.push(
        `ST_DWithin(n.location, ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)::geography, $${paramIndex + 2})`,
      );
      params.push(lat, lng, radius);
      paramIndex += 3;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY n.id, v.name ORDER BY n.id`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching NPCs:", err);
    res.status(500).json({ error: "Failed to fetch NPCs" });
  }
};

/**
 * Get a specific NPC by ID
 */
export const getNPCById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const query = `
      SELECT 
        n.id,
        n.name,
        n.description,
        n.avatar_url,
        n.venue_id,
        n.is_quest_giver,
        n.greeting_text,
        v.name as venue_name,
        ST_Y(n.location::geometry) as lat,
        ST_X(n.location::geometry) as lng
      FROM npcs n
      LEFT JOIN venues v ON n.venue_id = v.id
      WHERE n.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "NPC not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching NPC:", err);
    res.status(500).json({ error: "Failed to fetch NPC" });
  }
};

/**
 * Get quests available from a specific NPC
 */
export const getNPCQuests = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get available quests
    const availableQuery = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.reward_xp,
        q.reward_gold,
        nq.is_repeatable,
        nq.level_requirement,
        'AVAILABLE' as status
      FROM npc_quests nq
      JOIN quests q ON nq.quest_id = q.id
      LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $2
      CROSS JOIN users u
      WHERE nq.npc_id = $1 
        AND u.id = $2
        AND u.level >= nq.level_requirement
        AND (uq.id IS NULL OR uq.status != 'ACTIVE')
      ORDER BY nq.level_requirement, q.id
    `;

    // Get active quests from this NPC
    const activeQuery = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.reward_xp,
        q.reward_gold,
        nq.is_repeatable,
        nq.level_requirement,
        'ACTIVE' as status
      FROM npc_quests nq
      JOIN quests q ON nq.quest_id = q.id
      JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $2
      WHERE nq.npc_id = $1 
        AND uq.status = 'ACTIVE'
      ORDER BY q.id
    `;

    const [availableResult, activeResult] = await Promise.all([
      pool.query(availableQuery, [id, userId]),
      pool.query(activeQuery, [id, userId]),
    ]);

    res.json({
      available: availableResult.rows,
      active: activeResult.rows,
    });
  } catch (err) {
    console.error("Error fetching NPC quests:", err);
    res.status(500).json({ error: "Failed to fetch NPC quests" });
  }
};

/**
 * Accept a quest from an NPC
 */
export const acceptQuestFromNPC = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // NPC ID
    const { quest_id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await client.query("BEGIN");

    // Verify the quest is offered by this NPC
    const npcQuestCheck = await client.query(
      `SELECT nq.*, u.level as user_level
       FROM npc_quests nq
       CROSS JOIN users u
       WHERE nq.npc_id = $1 
         AND nq.quest_id = $2
         AND u.id = $3`,
      [id, quest_id, userId],
    );

    if (npcQuestCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Quest not offered by this NPC or user not found" });
    }

    const npcQuest = npcQuestCheck.rows[0];

    // Check level requirement
    if (npcQuest.user_level < npcQuest.level_requirement) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: `Level ${npcQuest.level_requirement} required`,
        level_requirement: npcQuest.level_requirement,
      });
    }

    // Check if user already has this quest
    const existingQuest = await client.query(
      `SELECT * FROM user_quests 
       WHERE user_id = $1 AND quest_id = $2 AND status = 'ACTIVE'`,
      [userId, quest_id],
    );

    if (existingQuest.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Quest already active" });
    }

    // If not repeatable, check if already completed
    if (!npcQuest.is_repeatable) {
      const completedQuest = await client.query(
        `SELECT * FROM user_quests 
         WHERE user_id = $1 AND quest_id = $2 AND status = 'COMPLETED'`,
        [userId, quest_id],
      );

      if (completedQuest.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Quest already completed" });
      }
    }

    // Add quest to user's quest log
    await client.query(
      `INSERT INTO user_quests (user_id, quest_id, status, accepted_at)
       VALUES ($1, $2, 'ACTIVE', NOW())
       ON CONFLICT (user_id, quest_id) DO NOTHING`,
      [userId, quest_id],
    );

    // Initialize progress for all objectives
    const objectives = await client.query(
      `SELECT id FROM quest_objectives WHERE quest_id = $1`,
      [quest_id],
    );

    for (const obj of objectives.rows) {
      await client.query(
        `INSERT INTO user_objective_progress (user_id, objective_id, is_completed, current_progress)
         VALUES ($1, $2, FALSE, 0)
         ON CONFLICT (user_id, objective_id) DO NOTHING`,
        [userId, obj.id],
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Quest accepted successfully",
      quest_id,
      npc_id: id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error accepting quest from NPC:", err);
    res.status(500).json({ error: "Failed to accept quest" });
  } finally {
    client.release();
  }
};

/**
 * Get NPC dialogue with quest conditions evaluated
 */
export const getNPCDialogue = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get NPC with dialogue tree
    const npcResult = await pool.query(
      `SELECT id, name, description, avatar_url, greeting_text, dialogue_tree
       FROM npcs WHERE id = $1`,
      [id],
    );

    if (npcResult.rows.length === 0) {
      return res.status(404).json({ error: "NPC not found" });
    }

    const npc = npcResult.rows[0];
    const dialogueTree = npc.dialogue_tree;
    const greetingNode = dialogueTree.greeting;

    let startNode = "greeting";

    // Check if greeting has a quest condition
    if (greetingNode?.check_quest && greetingNode?.if_active) {
      // Check if user has this quest active
      const questCheck = await pool.query(
        `SELECT uq.status 
         FROM user_quests uq
         JOIN quests q ON uq.quest_id = q.id
         WHERE uq.user_id = $1 AND q.title = $2`,
        [userId, greetingNode.check_quest],
      );

      if (
        questCheck.rows.length > 0 &&
        questCheck.rows[0].status === "ACTIVE"
      ) {
        startNode = greetingNode.if_active;
      }
    }

    res.json({
      npc: {
        id: npc.id,
        name: npc.name,
        description: npc.description,
        avatar_url: npc.avatar_url,
        greeting_text: npc.greeting_text,
        dialogue_tree: dialogueTree,
      },
      start_node: startNode,
    });
  } catch (err) {
    console.error("Error getting NPC dialogue:", err);
    res.status(500).json({ error: "Failed to get NPC dialogue" });
  }
};

/**
 * Get contextual dialogue text based on quest availability
 */
export const getContextualDialogue = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const node = req.params.node as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get NPC with dialogue tree
    const npcResult = await pool.query(
      `SELECT id, name, dialogue_tree FROM npcs WHERE id = $1`,
      [id],
    );

    if (npcResult.rows.length === 0) {
      return res.status(404).json({ error: "NPC not found" });
    }

    const npc = npcResult.rows[0];
    const dialogueTree = npc.dialogue_tree as DialogueTree;
    const dialogueNode = dialogueTree[node];

    if (!dialogueNode) {
      return res.status(404).json({ error: "Dialogue node not found" });
    }

    // If this is a quest node, check if we should redirect to a different node
    if (
      (dialogueNode.show_quests || dialogueNode.quest_title) &&
      dialogueNode.if_no_work
    ) {
      // Get available quests
      const availableQuestsResult = await pool.query(
        `SELECT q.id
         FROM npc_quests nq
         JOIN quests q ON nq.quest_id = q.id
         LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $2
         CROSS JOIN users u
         WHERE nq.npc_id = $1 
           AND u.id = $2
           AND u.level >= nq.level_requirement
           AND (uq.id IS NULL OR uq.status != 'IN_PROGRESS')
         LIMIT 1`,
        [id, userId],
      );

      // Get active quests from this NPC with quest title
      const activeQuestsResult = await pool.query(
        `SELECT q.title
         FROM npc_quests nq
         JOIN quests q ON nq.quest_id = q.id
         JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $2
         WHERE nq.npc_id = $1 AND uq.status = 'ACTIVE'
         LIMIT 1`,
        [id, userId],
      );

      // If no available quests but has active quests, redirect to if_no_work node
      if (
        availableQuestsResult.rows.length === 0 &&
        activeQuestsResult.rows.length > 0
      ) {
        const activeQuestTitle = activeQuestsResult.rows[0].title;
        let alternativeNodeName: string | null = null;

        // Check if if_no_work is an object with quest-specific mappings
        if (typeof dialogueNode.if_no_work === "object") {
          alternativeNodeName =
            dialogueNode.if_no_work[activeQuestTitle] || null;
        } else {
          // Simple string - use as is
          alternativeNodeName = dialogueNode.if_no_work;
        }

        if (alternativeNodeName) {
          const alternativeNode = dialogueTree[alternativeNodeName];
          if (alternativeNode) {
            return res.json({
              text: alternativeNode.text,
              node: alternativeNodeName,
              options: alternativeNode.options,
            });
          }
        }
      }
    }

    res.json({ text: dialogueNode.text, node });
  } catch (err) {
    console.error("Error getting contextual dialogue:", err);
    res.status(500).json({ error: "Failed to get contextual dialogue" });
  }
};
