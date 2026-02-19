// ============================================================================
// Quest State Machine
// ============================================================================

export type QuestState =
  | "LOCKED" // Prerequisites not met
  | "AVAILABLE" // Can be accepted (NPC shows ❗)
  | "ACTIVE" // In player's quest log
  | "READY" // Objectives complete, ready to turn in (NPC shows ❓)
  | "COMPLETED"; // Rewards claimed, archived

export type ObjectiveType =
  | "LOCATION" // Visit a venue
  | "SPEND" // Spend money
  | "COLLECT" // Collect items (future)
  | "KILL" // Defeat enemies (future)
  | "TALK" // Speak to NPC (future)
  | "REACH_LEVEL"; // Reach character level (future)

// ============================================================================
// Quest Prerequisites
// ============================================================================

export interface QuestPrerequisites {
  minLevel?: number;
  completedQuests?: number[]; // Quest IDs that must be completed first
  requiredItems?: number[]; // Item IDs (future)
  requiredFaction?: {
    // Faction reputation (future)
    factionId: number;
    minReputation: number;
  };
}

// ============================================================================
// Quest Definition (The Template)
// ============================================================================

export interface QuestDefinition {
  id: number;
  title: string;
  description: string;

  // Prerequisites
  prerequisites?: QuestPrerequisites;

  // Objectives (the goals)
  objectives: ObjectiveDefinition[];

  // Rewards
  reward_xp: number;
  reward_gold: number;
  reward_items?: number[]; // Item IDs (future)

  // Metadata
  category?: string; // "MAIN_STORY", "SIDE_QUEST", "DAILY", etc.
  is_repeatable: boolean;
  cooldown_hours?: number; // For repeatable quests

  // NPC associations
  giver_npc_id?: number;
  turn_in_npc_id?: number;

  created_at?: Date; // Optional for templates
}

// ============================================================================
// Quest Objectives
// ============================================================================

export interface ObjectiveDefinition {
  id: number;
  quest_id: number;
  order_index: number;
  description: string;

  // Objective Type & Target
  type: ObjectiveType;
  target_value: string; // The "what" (venue ID, item ID, etc.)
  target_count: number; // The "how many" (default 1)

  // Progress tracking
  current_progress?: number; // e.g., 3/5 rats killed

  // Rewards (optional objective-level rewards)
  reward_xp?: number;
  reward_gold?: number;
}

// ============================================================================
// User Quest Progress (Player-Specific Data)
// ============================================================================

export interface UserQuest {
  id: number;
  user_id: number;
  quest_id: number;

  status: QuestState;

  accepted_at?: Date;
  completed_at?: Date;
  turned_in_at?: Date; // When rewards were claimed

  // For repeatable quests
  completion_count?: number;
  last_completed_at?: Date;
}

export interface UserObjectiveProgress {
  id: number;
  user_id: number;
  objective_id: number;

  current_progress: number; // Incremental: 3/5
  is_completed: boolean;
  completed_at?: Date;
}

// ============================================================================
// Quest Events (Observer Pattern)
// ============================================================================

export interface QuestEvent {
  userId: number;
  type: ObjectiveType;
  data: any; // Payload varies by type
  timestamp?: Date;
}

// Specific event payloads
export interface LocationEventData {
  venueId: number;
  venueCategory?: string;
  coords?: { lat: number; lng: number };
}

export interface SpendEventData {
  amountCents: number;
  description?: string;
  venueId?: number;
}

// ============================================================================
// Processing Results
// ============================================================================

export interface QuestRewards {
  reward_xp: number;
  reward_gold: number;
  reward_items?: number[];
}

export interface ProcessEventResult {
  success: boolean;
  completed: ObjectiveDefinition[];
  questsCompleted?: number[]; // Quest IDs that were fully completed
  message?: string;
  rewards?: {
    xp: number;
    gold: number;
    levelUp?: boolean;
  };
}

// ============================================================================
// Handlers
// ============================================================================

export type ObjectiveHandler = (
  objective: ObjectiveDefinition,
  event: QuestEvent,
  currentProgress: number,
) => {
  satisfied: boolean; // Is objective complete?
  newProgress: number; // Updated progress value
};
