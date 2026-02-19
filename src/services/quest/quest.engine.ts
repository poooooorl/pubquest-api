import pool from "@/db/pool";
import { PoolClient } from "pg";
import {
  QuestEvent,
  ObjectiveDefinition,
  ProcessEventResult,
  QuestRewards,
  QuestState,
  QuestPrerequisites,
  QuestDefinition,
  UserQuest,
} from "@/services/quest/quest.types";
import { ObjectiveHandlers } from "@/services/quest/handlers/quest.handlers";
import { calculateLevel } from "@/services/level.service";

/**
 * Quest Engine - Data-Driven Architecture
 *
 * Implements:
 * - State Machine (LOCKED → AVAILABLE → ACTIVE → READY → COMPLETED)
 * - Observer Pattern (event broadcasting)
 * - Incremental Progress Tracking
 * - Prerequisites Validation
 */
export class QuestEngine {
  /**
   * Main entry point for processing quest events
   * Uses Observer Pattern - events broadcast to all matching objectives
   */
  static async processEvent(event: QuestEvent): Promise<ProcessEventResult> {
    const client = await pool.connect();
    try {
      console.log(
        `⚙️  QuestEngine: Processing ${event.type} event for User ${event.userId}`,
      );

      // Find all active objectives matching this event type
      const objectives = await this.findMatchingObjectives(client, event);

      if (objectives.length === 0) {
        return {
          success: false,
          completed: [],
          message: "No matching objectives found",
        };
      }

      // Evaluate and update progress for matching objectives
      const result = await this.evaluateObjectives(client, event, objectives);

      return result;
    } catch (err) {
      console.error("❌ QuestEngine Error:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // Quest State Machine
  // ==========================================================================

  /**
   * Get available quests for a user (passes prerequisites)
   */
  static async getAvailableQuests(
    client: PoolClient,
    userId: number,
  ): Promise<QuestDefinition[]> {
    // Get user level for prerequisite checks
    const userRes = await client.query<{ level: number }>(
      `SELECT level FROM users WHERE id = $1`,
      [userId],
    );
    const userLevel = userRes.rows[0]?.level || 1;

    // Get quests not yet started or completed (excluding active/ready)
    const query = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.reward_xp,
        q.reward_gold,
        q.category,
        q.is_repeatable,
        q.cooldown_hours,
        q.giver_npc_id,
        q.turn_in_npc_id,
        q.prerequisites,
        q.created_at
      FROM quests q
      WHERE q.id NOT IN (
        SELECT quest_id FROM user_quests 
        WHERE user_id = $1 
        AND status IN ('ACTIVE', 'READY')
      )
    `;

    const res = await client.query(query, [userId]);
    const allQuests = res.rows;

    // Filter by prerequisites
    const availableQuests: QuestDefinition[] = [];

    for (const quest of allQuests) {
      const canAccept = await this.checkPrerequisites(
        client,
        userId,
        userLevel,
        quest.prerequisites,
      );

      if (canAccept) {
        availableQuests.push(quest);
      }
    }

    return availableQuests;
  }

  /**
   * Check if user meets quest prerequisites
   */
  private static async checkPrerequisites(
    client: PoolClient,
    userId: number,
    userLevel: number,
    prerequisites?: QuestPrerequisites,
  ): Promise<boolean> {
    if (!prerequisites) {
      return true; // No requirements
    }

    // Check level requirement
    if (prerequisites.minLevel && userLevel < prerequisites.minLevel) {
      return false;
    }

    // Check completed quests
    if (
      prerequisites.completedQuests &&
      prerequisites.completedQuests.length > 0
    ) {
      const completedCheck = await client.query(
        `SELECT COUNT(*) as count FROM user_quests 
         WHERE user_id = $1 
         AND quest_id = ANY($2::int[]) 
         AND status = 'COMPLETED'`,
        [userId, prerequisites.completedQuests],
      );

      const completedCount = parseInt(completedCheck.rows[0].count);
      if (completedCount < prerequisites.completedQuests.length) {
        return false; // Not all required quests completed
      }
    }

    // Future: Check required items, faction rep, etc.

    return true;
  }

  /**
   * Accept a quest (AVAILABLE → ACTIVE)
   */
  static async acceptQuest(
    client: PoolClient,
    userId: number,
    questId: number,
  ): Promise<{ success: boolean; message: string }> {
    await client.query("BEGIN");

    try {
      // Verify quest is available (not already active)
      const existingQuest = await client.query(
        `SELECT status FROM user_quests WHERE user_id = $1 AND quest_id = $2`,
        [userId, questId],
      );

      if (existingQuest.rows.length > 0) {
        const status = existingQuest.rows[0].status;
        if (status === "ACTIVE" || status === "READY") {
          await client.query("ROLLBACK");
          return { success: false, message: "Quest already active" };
        }
      }

      // Create user_quest entry
      await client.query(
        `INSERT INTO user_quests (user_id, quest_id, status, accepted_at)
         VALUES ($1, $2, 'ACTIVE', NOW())
         ON CONFLICT (user_id, quest_id) 
         DO UPDATE SET status = 'ACTIVE', accepted_at = NOW()`,
        [userId, questId],
      );

      // Create objective progress entries
      const objectives = await client.query(
        `SELECT id FROM quest_objectives WHERE quest_id = $1`,
        [questId],
      );

      for (const obj of objectives.rows) {
        await client.query(
          `INSERT INTO user_objective_progress (user_id, objective_id, current_progress, is_completed)
           VALUES ($1, $2, 0, FALSE)
           ON CONFLICT (user_id, objective_id) DO NOTHING`,
          [userId, obj.id],
        );
      }

      await client.query("COMMIT");
      console.log(`✅ Quest ${questId} accepted by User ${userId}`);
      return { success: true, message: "Quest accepted!" };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  /**
   * Turn in a completed quest (READY → COMPLETED)
   */
  static async turnInQuest(
    client: PoolClient,
    userId: number,
    questId: number,
  ): Promise<{ success: boolean; message: string; rewards?: QuestRewards }> {
    await client.query("BEGIN");

    try {
      // Verify quest is READY
      const questCheck = await client.query(
        `SELECT status FROM user_quests WHERE user_id = $1 AND quest_id = $2`,
        [userId, questId],
      );

      if (questCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, message: "Quest not found" };
      }

      const status = questCheck.rows[0].status;
      if (status !== "READY") {
        await client.query("ROLLBACK");
        return { success: false, message: "Quest not ready to turn in" };
      }

      // Grant rewards
      const rewards = await this.grantQuestRewards(client, userId, questId);

      // Mark quest as completed
      await client.query(
        `UPDATE user_quests 
         SET status = 'COMPLETED', turned_in_at = NOW(), completion_count = completion_count + 1, last_completed_at = NOW()
         WHERE user_id = $1 AND quest_id = $2`,
        [userId, questId],
      );

      await client.query("COMMIT");
      console.log(`🏆 Quest ${questId} turned in by User ${userId}`);
      return { success: true, message: "Quest completed!", rewards };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  // ==========================================================================
  // Event Processing (Observer Pattern)
  // ==========================================================================

  /**
   * Find incomplete objectives for user matching the event type
   */
  private static async findMatchingObjectives(
    client: PoolClient,
    event: QuestEvent,
  ): Promise<ObjectiveDefinition[]> {
    const query = `
      SELECT DISTINCT 
        qo.id, 
        qo.quest_id, 
        qo.type, 
        qo.target_value,
        qo.target_count, 
        qo.order_index, 
        qo.reward_xp,
        qo.reward_gold,
        qo.description,
        uop.current_progress
      FROM quest_objectives qo
      JOIN user_quests uq ON qo.quest_id = uq.quest_id
      JOIN user_objective_progress uop ON uop.objective_id = qo.id AND uop.user_id = uq.user_id
      WHERE uq.user_id = $1
        AND uop.is_completed = FALSE
        AND uq.status = 'ACTIVE'
        AND qo.type = $2
    `;

    const res = await client.query(query, [event.userId, event.type]);
    return res.rows;
  }

  /**
   * Evaluate objectives against the event and update progress
   * Supports incremental objectives (e.g., "Kill 5 Rats")
   */
  private static async evaluateObjectives(
    client: PoolClient,
    event: QuestEvent,
    objectives: ObjectiveDefinition[],
  ): Promise<ProcessEventResult> {
    const completed: ObjectiveDefinition[] = [];
    const questsCompleted: number[] = [];
    let totalXp = 0;
    let totalGold = 0;

    for (const objective of objectives) {
      const handler = ObjectiveHandlers[objective.type];

      if (!handler) {
        console.warn(
          `⚠️  No handler found for objective type: ${objective.type}`,
        );
        continue;
      }

      // Get current progress
      const currentProgress = objective.current_progress || 0;

      // Check if objective is satisfied and get new progress
      const result = handler(objective, event, currentProgress);

      if (result.newProgress > currentProgress) {
        // Progress increased!
        const wasCompleted = await this.updateObjectiveProgress(
          client,
          event.userId,
          objective,
          result.newProgress,
          result.satisfied,
        );

        if (wasCompleted) {
          completed.push(objective);
          totalXp += objective.reward_xp || 0;
          totalGold += objective.reward_gold || 0;

          // Check if quest is complete
          const questComplete = await this.checkQuestCompletion(
            client,
            event.userId,
            objective.quest_id,
          );

          if (questComplete) {
            questsCompleted.push(objective.quest_id);
          }
        }
      }
    }

    return {
      success: completed.length > 0,
      completed,
      questsCompleted,
      message:
        completed.length > 0
          ? `Completed ${completed.length} objective(s)`
          : "Progress updated",
      rewards:
        totalXp > 0 || totalGold > 0
          ? { xp: totalXp, gold: totalGold }
          : undefined,
    };
  }

  /**
   * Update objective progress (supports incremental tracking)
   */
  private static async updateObjectiveProgress(
    client: PoolClient,
    userId: number,
    objective: ObjectiveDefinition,
    newProgress: number,
    isComplete: boolean,
  ): Promise<boolean> {
    await client.query("BEGIN");

    try {
      // Update progress
      const updateRes = await client.query(
        `UPDATE user_objective_progress 
         SET current_progress = $3,
             is_completed = $4,
             completed_at = CASE WHEN $4 = TRUE THEN NOW() ELSE completed_at END
         WHERE user_id = $1 
           AND objective_id = $2
           AND (current_progress < $3 OR is_completed = FALSE)`,
        [userId, objective.id, newProgress, isComplete],
      );

      // No rows updated = already at this progress or completed
      if (updateRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }

      if (isComplete) {
        console.log(
          `✅ Objective ${objective.id} completed! (${newProgress}/${objective.target_count})`,
        );

        // Grant objective-level rewards
        if (objective.reward_xp || objective.reward_gold) {
          await this.grantObjectiveReward(client, userId, objective);
        }
      } else {
        console.log(
          `📊 Objective ${objective.id} progress: ${newProgress}/${objective.target_count}`,
        );
      }

      await client.query("COMMIT");
      return isComplete;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  /**
   * Grant XP/gold reward for completing an objective
   */
  private static async grantObjectiveReward(
    client: PoolClient,
    userId: number,
    objective: ObjectiveDefinition,
  ): Promise<void> {
    const xp = objective.reward_xp || 0;
    const gold = objective.reward_gold || 0;

    if (xp > 0 || gold > 0) {
      // Get current XP and calculate new level
      const userRes = await client.query<{ xp: number }>(
        `SELECT xp FROM users WHERE id = $1`,
        [userId],
      );
      const newXP = userRes.rows[0].xp + xp;
      const newLevel = calculateLevel(newXP);

      await client.query(
        `UPDATE users SET xp = $1, level = $2, gold = gold + $3 WHERE id = $4`,
        [newXP, newLevel, gold, userId],
      );

      if (xp > 0) console.log(`  +${xp} XP awarded`);
      if (gold > 0) console.log(`  +${gold} Gold awarded`);
    }
  }

  /**
   * Check if all objectives for a quest are complete
   * If so, transition to READY state
   */
  private static async checkQuestCompletion(
    client: PoolClient,
    userId: number,
    questId: number,
  ): Promise<boolean> {
    // Check for remaining incomplete objectives
    const remaining = await client.query(
      `SELECT id FROM user_objective_progress 
       WHERE user_id = $1 
         AND objective_id IN (
           SELECT id FROM quest_objectives WHERE quest_id = $2
         )
         AND is_completed = FALSE`,
      [userId, questId],
    );

    // Quest not yet complete
    if (remaining.rows.length > 0) {
      return false;
    }

    // Mark quest as READY (atomic check to prevent duplicates)
    const questUpdateRes = await client.query(
      `UPDATE user_quests 
       SET status = 'READY', completed_at = NOW()
       WHERE user_id = $1 
         AND quest_id = $2 
         AND status = 'ACTIVE'`,
      [userId, questId],
    );

    // Already marked ready or completed
    if (questUpdateRes.rowCount === 0) {
      return false;
    }

    console.log(`🎯 Quest ${questId} is now READY to turn in!`);
    return true;
  }

  /**
   * Grant XP and gold rewards for completing a quest
   */
  private static async grantQuestRewards(
    client: PoolClient,
    userId: number,
    questId: number,
  ): Promise<QuestRewards> {
    const rewardRes = await client.query<QuestRewards>(
      `SELECT reward_xp, reward_gold FROM quests WHERE id = $1`,
      [questId],
    );

    const rewards = rewardRes.rows[0];
    const xp = rewards.reward_xp || 0;
    const gold = rewards.reward_gold || 0;

    // Get current XP and calculate new level
    const userRes = await client.query<{ xp: number }>(
      `SELECT xp FROM users WHERE id = $1`,
      [userId],
    );
    const newXP = userRes.rows[0].xp + xp;
    const newLevel = calculateLevel(newXP);

    await client.query(
      `UPDATE users SET xp = $1, level = $2, gold = gold + $3 WHERE id = $4`,
      [newXP, newLevel, gold, userId],
    );

    console.log(
      `🏆 Quest ${questId} rewards granted: +${xp} XP, +${gold} Gold`,
    );

    return rewards;
  }
}
