"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestStats = exports.deleteQuest = exports.updateQuest = exports.createQuest = exports.getQuestById = exports.getAllQuests = void 0;
const quest_editor_1 = require("../../services/quest/quest.editor");
const pool_1 = __importDefault(require("../../db/pool"));
/**
 * CMS Controller for Quest Management
 * CRUD operations for the admin panel
 */
/**
 * GET /api/cms/quests
 * List all quests with basic info
 */
const getAllQuests = async (req, res) => {
    const client = await pool_1.default.connect();
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
    }
    catch (err) {
        console.error("Error fetching quests:", err);
        res.status(500).json({ error: "Failed to fetch quests" });
    }
    finally {
        client.release();
    }
};
exports.getAllQuests = getAllQuests;
/**
 * GET /api/cms/quests/:id
 * Get detailed quest for editing
 */
const getQuestById = async (req, res) => {
    try {
        const questId = parseInt(req.params.id);
        const quest = await quest_editor_1.QuestEditorService.getQuestForEditor(questId);
        if (!quest) {
            return res.status(404).json({ error: "Quest not found" });
        }
        res.json(quest);
    }
    catch (err) {
        console.error("Error fetching quest:", err);
        res.status(500).json({ error: "Failed to fetch quest" });
    }
};
exports.getQuestById = getQuestById;
/**
 * POST /api/cms/quests
 * Create new quest
 */
const createQuest = async (req, res) => {
    try {
        const questData = {
            id: 0, // Will be generated
            ...req.body,
            objectives: req.body.objectives || [],
        };
        const savedQuest = await quest_editor_1.QuestEditorService.saveQuest(questData);
        res.status(201).json(savedQuest);
    }
    catch (err) {
        console.error("Error creating quest:", err);
        res.status(500).json({ error: "Failed to create quest" });
    }
};
exports.createQuest = createQuest;
/**
 * PUT /api/cms/quests/:id
 * Update existing quest
 */
const updateQuest = async (req, res) => {
    try {
        const questId = parseInt(req.params.id);
        const questData = {
            ...req.body,
            id: questId,
        };
        const savedQuest = await quest_editor_1.QuestEditorService.saveQuest(questData);
        res.json(savedQuest);
    }
    catch (err) {
        console.error("Error updating quest:", err);
        res.status(500).json({ error: "Failed to update quest" });
    }
};
exports.updateQuest = updateQuest;
/**
 * DELETE /api/cms/quests/:id
 * Delete quest (and cascade to objectives)
 */
const deleteQuest = async (req, res) => {
    const client = await pool_1.default.connect();
    try {
        const questId = parseInt(req.params.id);
        // Check if quest is in use by users
        const inUseCheck = await client.query(`SELECT COUNT(*) as count FROM user_quests WHERE quest_id = $1`, [questId]);
        if (parseInt(inUseCheck.rows[0].count) > 0) {
            return res.status(400).json({
                error: "Cannot delete quest that users have accepted",
                in_use: true,
            });
        }
        await client.query(`DELETE FROM quests WHERE id = $1`, [questId]);
        res.json({ message: "Quest deleted successfully", id: questId });
    }
    catch (err) {
        console.error("Error deleting quest:", err);
        res.status(500).json({ error: "Failed to delete quest" });
    }
    finally {
        client.release();
    }
};
exports.deleteQuest = deleteQuest;
/**
 * GET /api/cms/quests/stats
 * Get quest statistics for dashboard
 */
const getQuestStats = async (req, res) => {
    const client = await pool_1.default.connect();
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
    }
    catch (err) {
        console.error("Error fetching quest stats:", err);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
    finally {
        client.release();
    }
};
exports.getQuestStats = getQuestStats;
