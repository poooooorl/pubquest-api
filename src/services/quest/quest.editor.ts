import pool from "@/db/pool";
import {
  QuestDefinition,
  ObjectiveDefinition,
} from "@/services/quest/quest.types";

/**
 * Quest Editor Service - CMS Backend
 *
 * Allows creating and editing quests dynamically via an Admin UI.
 * This bridges the gap between a frontend form and the database tables.
 */
export class QuestEditorService {
  /**
   * Create or Update a full Quest Definition
   * Handles the quest itself and all its objectives transactionally.
   */
  static async saveQuest(questData: QuestDefinition): Promise<QuestDefinition> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Upsert the Main Quest Record
      // If ID exists, update. If 0/null, insert.
      let questId = questData.id;

      if (questId && questId > 0) {
        // UPDATE existing
        await client.query(
          `UPDATE quests SET 
            title = $1, description = $2, reward_xp = $3, reward_gold = $4, 
            category = $5, is_repeatable = $6, cooldown_hours = $7, 
            giver_npc_id = $8, turn_in_npc_id = $9, prerequisites = $10
           WHERE id = $11`,
          [
            questData.title,
            questData.description,
            questData.reward_xp,
            questData.reward_gold,
            questData.category || "SIDE_QUEST",
            questData.is_repeatable || false,
            questData.cooldown_hours || null,
            questData.giver_npc_id || null,
            questData.turn_in_npc_id || null,
            JSON.stringify(questData.prerequisites || {}),
            questId,
          ],
        );

        // Delete existing objectives (simplest way to handle re-ordering/deletions)
        await client.query(`DELETE FROM quest_objectives WHERE quest_id = $1`, [
          questId,
        ]);
      } else {
        // INSERT new
        const res = await client.query(
          `INSERT INTO quests (
            title, description, reward_xp, reward_gold, category, 
            is_repeatable, cooldown_hours, giver_npc_id, turn_in_npc_id, prerequisites
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            questData.title,
            questData.description,
            questData.reward_xp,
            questData.reward_gold,
            questData.category || "SIDE_QUEST",
            questData.is_repeatable || false,
            questData.cooldown_hours || null,
            questData.giver_npc_id || null,
            questData.turn_in_npc_id || null,
            JSON.stringify(questData.prerequisites || {}),
          ],
        );
        questId = res.rows[0].id;
      }

      // 2. Insert Objectives
      if (questData.objectives && questData.objectives.length > 0) {
        for (const [index, obj] of questData.objectives.entries()) {
          await client.query(
            `INSERT INTO quest_objectives (
              quest_id, type, description, target_value, target_count, 
              order_index, reward_xp, reward_gold
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              questId,
              obj.type,
              obj.description,
              obj.target_value,
              obj.target_count || 1,
              index + 1, // Auto-assign order based on array position
              obj.reward_xp || 0,
              obj.reward_gold || 0,
            ],
          );
        }
      }

      await client.query("COMMIT");

      // Return the fully saved object (with new ID if created)
      return { ...questData, id: questId };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ QuestEditorService Error:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get a full quest definition for the editor
   */
  static async getQuestForEditor(
    questId: number,
  ): Promise<QuestDefinition | null> {
    const client = await pool.connect();
    try {
      // Get Quest
      const questRes = await client.query(
        `SELECT * FROM quests WHERE id = $1`,
        [questId],
      );
      if (questRes.rows.length === 0) return null;

      const quest = questRes.rows[0];

      // Get Objectives
      const objRes = await client.query(
        `SELECT * FROM quest_objectives WHERE quest_id = $1 ORDER BY order_index ASC`,
        [questId],
      );

      return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        reward_xp: quest.reward_xp,
        reward_gold: quest.reward_gold,
        category: quest.category,
        is_repeatable: quest.is_repeatable,
        cooldown_hours: quest.cooldown_hours,
        giver_npc_id: quest.giver_npc_id,
        turn_in_npc_id: quest.turn_in_npc_id,
        prerequisites: quest.prerequisites,
        objectives: objRes.rows.map((o) => ({
          id: o.id,
          quest_id: o.quest_id,
          type: o.type,
          description: o.description,
          target_value: o.target_value,
          target_count: o.target_count,
          order_index: o.order_index,
          reward_xp: o.reward_xp,
          reward_gold: o.reward_gold,
        })),
      };
    } finally {
      client.release();
    }
  }
}
