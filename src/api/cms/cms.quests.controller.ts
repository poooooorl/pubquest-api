import { Request, Response } from "express";
import { QuestEditorService } from "@/services/quest/quest.editor";
import pool from "@/db/pool";
import { QuestDefinition } from "@/services/quest/quest.types";

/**
 * CMS Controller for Quest Management
 * CRUD operations for the admin panel
 */

/**
 * GET /api/cms/quests
 * List all quests with basic info
 */
export const getAllQuests = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        q.id,
        q.title,
        q.description,
        q.category,
        q.reward_xp,
        q.reward_gold,
        q.is_repeatable,
        q.giver_npc_id,
        n.name as giver_npc_name,
        COUNT(qo.id) as objective_count,
        q.created_at
      FROM quests q
      LEFT JOIN npcs n ON q.giver_npc_id = n.id
      LEFT JOIN quest_objectives qo ON q.id = qo.quest_id
      GROUP BY q.id, n.name
      ORDER BY q.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching quests:", err);
    res.status(500).json({ error: "Failed to fetch quests" });
  } finally {
    client.release();
  }
};

/**
 * GET /api/cms/quests/:id
 * Get detailed quest for editing
 */
export const getQuestById = async (req: Request, res: Response) => {
  try {
    const questId = parseInt(req.params.id as string);
    const quest = await QuestEditorService.getQuestForEditor(questId);

    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    res.json(quest);
  } catch (err) {
    console.error("Error fetching quest:", err);
    res.status(500).json({ error: "Failed to fetch quest" });
  }
};

/**
 * POST /api/cms/quests
 * Create new quest
 */
export const createQuest = async (req: Request, res: Response) => {
  try {
    const questData: QuestDefinition = {
      id: 0, // Will be generated
      ...req.body,
      objectives: req.body.objectives || [],
    };

    const savedQuest = await QuestEditorService.saveQuest(questData);
    res.status(201).json(savedQuest);
  } catch (err) {
    console.error("Error creating quest:", err);
    res.status(500).json({ error: "Failed to create quest" });
  }
};

/**
 * PUT /api/cms/quests/:id
 * Update existing quest
 */
export const updateQuest = async (req: Request, res: Response) => {
  try {
    const questId = parseInt(req.params.id as string);
    const questData: QuestDefinition = {
      ...req.body,
      id: questId,
    };

    const savedQuest = await QuestEditorService.saveQuest(questData);
    res.json(savedQuest);
  } catch (err) {
    console.error("Error updating quest:", err);
    res.status(500).json({ error: "Failed to update quest" });
  }
};

/**
 * DELETE /api/cms/quests/:id
 * Delete quest (and cascade to objectives)
 */
export const deleteQuest = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const questId = parseInt(req.params.id as string);

    // Check if quest is in use by users
    const inUseCheck = await client.query(
      `SELECT COUNT(*) as count FROM user_quests WHERE quest_id = $1`,
      [questId],
    );

    if (parseInt(inUseCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: "Cannot delete quest that users have accepted",
        in_use: true,
      });
    }

    await client.query(`DELETE FROM quests WHERE id = $1`, [questId]);
    res.json({ message: "Quest deleted successfully", id: questId });
  } catch (err) {
    console.error("Error deleting quest:", err);
    res.status(500).json({ error: "Failed to delete quest" });
  } finally {
    client.release();
  }
};

/**
 * GET /api/cms/quests/stats
 * Get quest statistics for dashboard
 */
export const getQuestStats = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_quests,
        COUNT(*) FILTER (WHERE category = 'MAIN_STORY') as main_story_count,
        COUNT(*) FILTER (WHERE category = 'SIDE_QUEST') as side_quest_count,
        COUNT(*) FILTER (WHERE category = 'DAILY') as daily_count,
        COUNT(*) FILTER (WHERE is_repeatable = true) as repeatable_count,
        (SELECT COUNT(*) FROM quest_objectives) as total_objectives
      FROM quests
    `);

    res.json(stats.rows[0]);
  } catch (err) {
    console.error("Error fetching quest stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  } finally {
    client.release();
  }
};
