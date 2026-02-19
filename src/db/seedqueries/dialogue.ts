import { PoolClient } from "pg";

interface OldDialogueNode {
  text: string;
  return_text?: string;
  conditional_texts?: Array<{
    text: string;
    return_text?: string;
    conditions: any;
  }>;
  options?: Array<{ text: string; next: string; conditions?: any }>;
  quest_title?: string;
  show_quests?: boolean;
  end?: boolean;
  check_quest?: string;
  if_active?: string;
  if_no_work?: Record<string, string>;
}

interface OldDialogueTree {
  [key: string]: OldDialogueNode;
}

/**
 * Convert old dialogue_tree JSON format to new dialogue_nodes table
 */
export async function seedDialogueNodes(
  client: PoolClient,
  npcs: any[],
  quests: any[],
) {
  console.log("💬 Converting dialogue trees to nodes...");

  for (const npc of npcs) {
    if (!npc.dialogue_tree || typeof npc.dialogue_tree !== "object") {
      console.log(`   ⚠️  No dialogue tree for ${npc.name}`);
      continue;
    }

    const dialogueTree = npc.dialogue_tree as OldDialogueTree;
    const nodeMap = new Map<string, number>(); // old key -> new node id

    // First pass: Create all NPC nodes (without parent relationships)
    for (const [key, node] of Object.entries(dialogueTree)) {
      const isRoot = key === "greeting";

      // Determine actions based on node properties
      const actions: any[] = [];

      if (node.end) {
        actions.push({ type: "END_CONVERSATION" });
      }

      if (node.quest_title) {
        // Find quest by title
        const quest = quests.find((q) => q.title === node.quest_title);
        if (quest) {
          actions.push({ type: "ACCEPT_QUEST", questId: quest.id });
        }
      }

      // Create NPC node
      const result = await client.query(
        `INSERT INTO dialogue_nodes (npc_id, text, return_text, conditional_texts, speaker, is_root, actions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          npc.id,
          node.text,
          node.return_text || null,
          node.conditional_texts
            ? JSON.stringify(node.conditional_texts)
            : null,
          "NPC",
          isRoot,
          actions.length > 0 ? JSON.stringify(actions) : null,
        ],
      );

      nodeMap.set(key, result.rows[0].id);
    }

    // Second pass: Create player response nodes and link to next nodes
    for (const [key, node] of Object.entries(dialogueTree)) {
      const parentNodeId = nodeMap.get(key);

      if (!parentNodeId) continue;

      // Create player response nodes
      if (node.options && node.options.length > 0) {
        for (const option of node.options) {
          const nextNodeId = nodeMap.get(option.next);

          if (!nextNodeId) {
            console.log(
              `   ⚠️  Next node not found: ${option.next} for ${npc.name}`,
            );
            continue;
          }

          // Create player choice node with explicit next_node_id
          await client.query(
            `INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, next_node_id, is_root, button_text, conditions)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              npc.id,
              option.text,
              "PLAYER",
              parentNodeId,
              nextNodeId,
              false,
              option.text,
              option.conditions ? JSON.stringify(option.conditions) : null,
            ],
          );
        }
      }
    }

    console.log(`   ✅ Converted dialogue tree for ${npc.name}`);
  }

  // Third pass: Handle conditional nodes (quest state checks)
  for (const npc of npcs) {
    if (!npc.dialogue_tree) continue;

    const dialogueTree = npc.dialogue_tree as OldDialogueTree;

    for (const [key, node] of Object.entries(dialogueTree)) {
      if (node.check_quest && node.if_active) {
        // Find the quest
        const quest = quests.find((q) => q.title === node.check_quest);

        if (quest) {
          // Find the "if_active" node
          const ifActiveNodeResult = await client.query(
            `SELECT id FROM dialogue_nodes 
             WHERE npc_id = $1 AND text LIKE $2
             ORDER BY id LIMIT 1`,
            [
              npc.id,
              `%${dialogueTree[node.if_active]?.text?.substring(0, 30)}%`,
            ],
          );

          if (ifActiveNodeResult.rows.length > 0) {
            const ifActiveNodeId = ifActiveNodeResult.rows[0].id;

            // Update with condition to show only when quest is active
            await client.query(
              `UPDATE dialogue_nodes 
               SET conditions = $1, is_root = true
               WHERE id = $2`,
              [
                JSON.stringify({
                  questState: { questId: quest.id, state: "ACTIVE" },
                }),
                ifActiveNodeId,
              ],
            );
          }
        }
      }
    }
  }

  console.log("💬 Dialogue tree conversion complete!");
}
