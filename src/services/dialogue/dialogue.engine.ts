import pool from "@/db/pool";
import { PoolClient } from "pg";
import {
  DialogueNode,
  DialogueConditions,
  DialogueAction,
  DialogueResponse,
  ConversationState,
} from "./dialogue.types";
import { QuestEngine } from "@/services/quest/quest.engine";

/**
 * Dialogue Engine
 *
 * Manages node-based conversations with conditional branching
 */
export class DialogueEngine {
  /**
   * Start a conversation with an NPC
   * Returns root dialogue node(s) and available choices
   */
  static async startConversation(
    userId: number,
    npcId: number,
  ): Promise<DialogueResponse> {
    const client = await pool.connect();
    try {
      // Get NPC info
      const npcRes = await client.query(
        `SELECT id, name, avatar_url FROM npcs WHERE id = $1`,
        [npcId],
      );

      if (npcRes.rows.length === 0) {
        throw new Error(`NPC ${npcId} not found`);
      }

      const npc = npcRes.rows[0];

      // Get root dialogue nodes
      const rootNodes = await this.getRootNodes(client, npcId);

      if (rootNodes.length === 0) {
        // No dialogue tree defined, use default greeting
        return {
          npc,
          text: npc.greeting_text || "Greetings, traveler!",
          speaker: "NPC",
          choices: [],
        };
      }

      // Filter root nodes by conditions
      const availableRoots = await this.filterByConditions(
        client,
        userId,
        rootNodes,
      );

      // Get the first available root node
      const currentNode = availableRoots[0];

      // Get child nodes (player's response options)
      const childNodes = await this.getChildNodes(client, currentNode.id);
      const availableChoices = await this.filterByConditions(
        client,
        userId,
        childNodes,
      );

      return {
        npc,
        text: currentNode.text,
        speaker: currentNode.speaker,
        choices: availableChoices.map((node) => ({
          node_id: node.id,
          text: node.text,
          button_text: node.button_text || node.text,
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Select a dialogue choice
   * Processes actions and returns next dialogue state
   */
  static async selectChoice(
    userId: number,
    npcId: number,
    nodeId: number,
  ): Promise<DialogueResponse> {
    const client = await pool.connect();
    await client.query("BEGIN");

    try {
      // Get NPC info
      const npcRes = await client.query(
        `SELECT id, name, avatar_url FROM npcs WHERE id = $1`,
        [npcId],
      );
      const npc = npcRes.rows[0];

      // Get selected node
      const nodeRes = await client.query<DialogueNode>(
        `SELECT * FROM dialogue_nodes WHERE id = $1 AND npc_id = $2`,
        [nodeId, npcId],
      );

      if (nodeRes.rows.length === 0) {
        throw new Error(`Dialogue node ${nodeId} not found`);
      }

      const selectedNode = nodeRes.rows[0];

      // Process actions
      const actionsTriggered: DialogueAction[] = [];
      const questUpdates: any[] = [];

      if (selectedNode.actions) {
        for (const action of selectedNode.actions as DialogueAction[]) {
          const result = await this.executeAction(client, userId, action);

          if (result) {
            actionsTriggered.push(action);
            if (
              action.type === "ACCEPT_QUEST" ||
              action.type === "COMPLETE_QUEST"
            ) {
              questUpdates.push(result);
            }
          }
        }
      }

      // Get child nodes (next dialogue options)
      const childNodes = await this.getChildNodes(client, selectedNode.id);
      const availableChoices = await this.filterByConditions(
        client,
        userId,
        childNodes,
      );

      await client.query("COMMIT");

      return {
        npc,
        text: selectedNode.text,
        speaker: selectedNode.speaker,
        choices: availableChoices.map((node) => ({
          node_id: node.id,
          text: node.text,
          button_text: node.button_text || node.text,
        })),
        actions_triggered:
          actionsTriggered.length > 0 ? actionsTriggered : undefined,
        quest_updates: questUpdates.length > 0 ? questUpdates : undefined,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // Node Retrieval
  // ==========================================================================

  /**
   * Get root dialogue nodes for an NPC
   */
  private static async getRootNodes(
    client: PoolClient,
    npcId: number,
  ): Promise<DialogueNode[]> {
    const res = await client.query(
      `SELECT * FROM dialogue_nodes 
       WHERE npc_id = $1 AND is_root = TRUE 
       ORDER BY id`,
      [npcId],
    );
    return res.rows;
  }

  /**
   * Get child nodes of a parent node
   */
  private static async getChildNodes(
    client: PoolClient,
    parentNodeId: number,
  ): Promise<DialogueNode[]> {
    const res = await client.query(
      `SELECT * FROM dialogue_nodes 
       WHERE parent_node_id = $1 
       ORDER BY id`,
      [parentNodeId],
    );
    return res.rows;
  }

  // ==========================================================================
  // Condition Evaluation
  // ==========================================================================

  /**
   * Filter dialogue nodes by conditions
   */
  private static async filterByConditions(
    client: PoolClient,
    userId: number,
    nodes: DialogueNode[],
  ): Promise<DialogueNode[]> {
    const available: DialogueNode[] = [];

    for (const node of nodes) {
      const canShow = await this.checkConditions(
        client,
        userId,
        node.conditions as DialogueConditions | undefined,
      );

      if (canShow) {
        available.push(node);
      }
    }

    return available;
  }

  /**
   * Check if user meets dialogue node conditions
   */
  private static async checkConditions(
    client: PoolClient,
    userId: number,
    conditions?: DialogueConditions,
  ): Promise<boolean> {
    if (!conditions) {
      return true; // No conditions = always available
    }

    // Get user info
    const userRes = await client.query(
      `SELECT level FROM users WHERE id = $1`,
      [userId],
    );
    const userLevel = userRes.rows[0]?.level || 1;

    // Check level requirements
    if (conditions.minLevel && userLevel < conditions.minLevel) {
      return false;
    }
    if (conditions.maxLevel && userLevel > conditions.maxLevel) {
      return false;
    }

    // Check completed quests
    if (conditions.completedQuests && conditions.completedQuests.length > 0) {
      const completedRes = await client.query(
        `SELECT COUNT(*) as count FROM user_quests 
         WHERE user_id = $1 
         AND quest_id = ANY($2::int[]) 
         AND status = 'COMPLETED'`,
        [userId, conditions.completedQuests],
      );
      const completedCount = parseInt(completedRes.rows[0].count);
      if (completedCount < conditions.completedQuests.length) {
        return false;
      }
    }

    // Check NOT completed quests
    if (
      conditions.notCompletedQuests &&
      conditions.notCompletedQuests.length > 0
    ) {
      const completedRes = await client.query(
        `SELECT COUNT(*) as count FROM user_quests 
         WHERE user_id = $1 
         AND quest_id = ANY($2::int[]) 
         AND status = 'COMPLETED'`,
        [userId, conditions.notCompletedQuests],
      );
      const completedCount = parseInt(completedRes.rows[0].count);
      if (completedCount > 0) {
        return false; // Should NOT have completed these
      }
    }

    // Check active quests
    if (conditions.activeQuests && conditions.activeQuests.length > 0) {
      const activeRes = await client.query(
        `SELECT COUNT(*) as count FROM user_quests 
         WHERE user_id = $1 
         AND quest_id = ANY($2::int[]) 
         AND status IN ('ACTIVE', 'READY')`,
        [userId, conditions.activeQuests],
      );
      const activeCount = parseInt(activeRes.rows[0].count);
      if (activeCount < conditions.activeQuests.length) {
        return false;
      }
    }

    // Check quest state
    if (conditions.questState) {
      const stateRes = await client.query(
        `SELECT status FROM user_quests 
         WHERE user_id = $1 AND quest_id = $2`,
        [userId, conditions.questState.questId],
      );

      if (stateRes.rows.length === 0) {
        // Quest not started - only match if looking for AVAILABLE
        return conditions.questState.state === "AVAILABLE";
      }

      const currentState = stateRes.rows[0].status;
      if (currentState !== conditions.questState.state) {
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // Action Execution
  // ==========================================================================

  /**
   * Execute a dialogue action
   */
  private static async executeAction(
    client: PoolClient,
    userId: number,
    action: DialogueAction,
  ): Promise<any> {
    console.log(`🎭 Executing dialogue action: ${action.type}`);

    switch (action.type) {
      case "ACCEPT_QUEST":
        if (!action.questId) {
          throw new Error("ACCEPT_QUEST action requires questId");
        }
        const acceptResult = await QuestEngine.acceptQuest(
          client,
          userId,
          action.questId,
        );
        return {
          quest_id: action.questId,
          new_state: "ACTIVE",
          message: acceptResult.message,
        };

      case "COMPLETE_QUEST":
        if (!action.questId) {
          throw new Error("COMPLETE_QUEST action requires questId");
        }
        const turnInResult = await QuestEngine.turnInQuest(
          client,
          userId,
          action.questId,
        );
        return {
          quest_id: action.questId,
          new_state: "COMPLETED",
          message: turnInResult.message,
          rewards: turnInResult.rewards,
        };

      case "GIVE_GOLD":
        if (!action.amount) {
          throw new Error("GIVE_GOLD action requires amount");
        }
        await client.query(`UPDATE users SET gold = gold + $1 WHERE id = $2`, [
          action.amount,
          userId,
        ]);
        console.log(`  +${action.amount} Gold given`);
        return { gold_given: action.amount };

      case "TAKE_GOLD":
        if (!action.amount) {
          throw new Error("TAKE_GOLD action requires amount");
        }
        await client.query(`UPDATE users SET gold = gold - $1 WHERE id = $2`, [
          action.amount,
          userId,
        ]);
        console.log(`  -${action.amount} Gold taken`);
        return { gold_taken: action.amount };

      case "END_CONVERSATION":
        console.log("  Conversation ended");
        return null;

      default:
        console.warn(`⚠️  Unknown action type: ${action.type}`);
        return null;
    }
  }
}
