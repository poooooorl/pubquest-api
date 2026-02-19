/**
 * Dialogue System Types
 *
 * Implements a Node-Based Directed Acyclic Graph (DAG) for conversations
 */

// ============================================================================
// Dialogue Node (The "Bubble")
// ============================================================================

export interface DialogueNode {
  id: number;
  npc_id: number;

  // Content
  text: string;
  speaker: "NPC" | "PLAYER";

  // Graph structure
  parent_node_id?: number;
  is_root: boolean; // Starting point of conversation

  // Conditional display (show node if conditions met)
  conditions?: DialogueConditions;

  // Actions triggered when node is selected
  actions?: DialogueAction[];

  // UI
  button_text?: string; // For player choices
}

// ============================================================================
// Conditions (When to show a node)
// ============================================================================

export interface DialogueConditions {
  minLevel?: number;
  maxLevel?: number;
  completedQuests?: number[]; // Must have completed these quests
  activeQuests?: number[]; // Must have these quests active
  notCompletedQuests?: number[]; // Must NOT have completed these
  hasItems?: number[]; // Must have these items (future)
  questState?: {
    questId: number;
    state: "AVAILABLE" | "ACTIVE" | "READY" | "COMPLETED";
  };
}

// ============================================================================
// Actions (What happens when node is selected)
// ============================================================================

export type DialogueActionType =
  | "ACCEPT_QUEST"
  | "COMPLETE_QUEST" // Turn in quest
  | "GIVE_ITEM" // Give item to player (future)
  | "TAKE_ITEM" // Take item from player (future)
  | "GIVE_GOLD"
  | "TAKE_GOLD"
  | "TRIGGER_EVENT" // Custom event (future)
  | "END_CONVERSATION";

export interface DialogueAction {
  type: DialogueActionType;
  questId?: number;
  itemId?: number;
  amount?: number;
  eventId?: string;
}

// ============================================================================
// Conversation State
// ============================================================================

export interface ConversationState {
  npc_id: number;
  current_node_id?: number; // null = start of conversation
  visited_nodes: number[]; // Track conversation flow
  available_choices: DialogueNode[]; // Player options at current node
}

// ============================================================================
// Dialogue Response (API Response)
// ============================================================================

export interface DialogueResponse {
  npc: {
    id: number;
    name: string;
    avatar_url?: string;
  };

  // Current dialogue
  text: string;
  speaker: "NPC" | "PLAYER";

  // Available player responses
  choices: {
    node_id: number;
    text: string;
    button_text: string;
  }[];

  // Actions that were triggered (if any)
  actions_triggered?: DialogueAction[];

  // Quest state changes
  quest_updates?: {
    quest_id: number;
    new_state: string;
    message: string;
  }[];
}
