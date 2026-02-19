-- ============================================================================
-- Quest System Enhancements Migration
-- Adds state machine, prerequisites, and incremental progress tracking
-- ============================================================================

-- ============================================================================
-- 1. Enhance Quests Table
-- ============================================================================

ALTER TABLE quests 
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SIDE_QUEST',
  ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cooldown_hours INT,
  ADD COLUMN IF NOT EXISTS giver_npc_id INT REFERENCES npcs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS turn_in_npc_id INT REFERENCES npcs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prerequisites JSONB; -- Stores QuestPrerequisites

COMMENT ON COLUMN quests.category IS 'MAIN_STORY, SIDE_QUEST, DAILY, WEEKLY, etc.';
COMMENT ON COLUMN quests.prerequisites IS 'JSON: {minLevel, completedQuests[], requiredItems[], requiredFaction}';

-- Index for NPC quest lookup
CREATE INDEX IF NOT EXISTS idx_quests_giver_npc ON quests(giver_npc_id);
CREATE INDEX IF NOT EXISTS idx_quests_turn_in_npc ON quests(turn_in_npc_id);

-- ============================================================================
-- 2. Enhance Quest Objectives Table
-- ============================================================================

ALTER TABLE quest_objectives
  ADD COLUMN IF NOT EXISTS target_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_gold INT DEFAULT 0;

COMMENT ON COLUMN quest_objectives.target_count IS 'How many times the objective must be completed (e.g., 5 for "Kill 5 Rats")';

-- Update existing objectives to have target_count = 1
UPDATE quest_objectives SET target_count = 1 WHERE target_count IS NULL;

-- ============================================================================
-- 3. Enhance User Quests Table (State Machine)
-- ============================================================================

-- First, update existing statuses to new enum values if needed
UPDATE user_quests SET status = 'ACTIVE' WHERE status = 'IN_PROGRESS';

ALTER TABLE user_quests
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS turned_in_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completion_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP;

-- Update accepted_at for existing active quests (estimate)
UPDATE user_quests 
  SET accepted_at = completed_at 
  WHERE status = 'ACTIVE' AND accepted_at IS NULL;

COMMENT ON COLUMN user_quests.status IS 'LOCKED, AVAILABLE, ACTIVE, READY, COMPLETED';
COMMENT ON COLUMN user_quests.completion_count IS 'For repeatable quests';

-- Index for quest state queries
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);
CREATE INDEX IF NOT EXISTS idx_user_quests_user_status ON user_quests(user_id, status);

-- ============================================================================
-- 4. Enhance User Objective Progress (Incremental Tracking)
-- ============================================================================

ALTER TABLE user_objective_progress
  ADD COLUMN IF NOT EXISTS current_progress INT DEFAULT 0;

-- Backfill existing progress: completed = target_count, else 0
UPDATE user_objective_progress uop
SET current_progress = CASE 
  WHEN uop.is_completed THEN qo.target_count 
  ELSE 0 
END
FROM quest_objectives qo
WHERE uop.objective_id = qo.id
  AND uop.current_progress = 0;

COMMENT ON COLUMN user_objective_progress.current_progress IS 'Incremental progress (e.g., 3/5 rats killed)';

-- Index for progress queries
CREATE INDEX IF NOT EXISTS idx_user_objective_progress_user ON user_objective_progress(user_id);

-- ============================================================================
-- 5. Dialogue System Tables
-- ============================================================================

-- Dialogue Nodes: Individual conversation bubbles
CREATE TABLE IF NOT EXISTS dialogue_nodes (
    id SERIAL PRIMARY KEY,
    npc_id INT REFERENCES npcs(id) ON DELETE CASCADE,
    
    -- Content
    text TEXT NOT NULL,
    speaker VARCHAR(50) DEFAULT 'NPC', -- 'NPC' or 'PLAYER'
    
    -- Graph structure
    parent_node_id INT REFERENCES dialogue_nodes(id) ON DELETE CASCADE,
    is_root BOOLEAN DEFAULT FALSE, -- Starting nodes for conversation
    
    -- Conditional display
    conditions JSONB, -- {minLevel, completedQuests[], hasItems[], questState}
    
    -- Actions triggered by this node
    actions JSONB, -- [{type: 'ACCEPT_QUEST', questId: 1}, {type: 'COMPLETE_QUEST', questId: 1}]
    
    -- UI
    button_text VARCHAR(100), -- For player choices
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogue_nodes_npc ON dialogue_nodes(npc_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_nodes_parent ON dialogue_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_nodes_root ON dialogue_nodes(is_root) WHERE is_root = TRUE;

COMMENT ON COLUMN dialogue_nodes.conditions IS 'JSON: {minLevel, completedQuests[], hasItems[], questState}';
COMMENT ON COLUMN dialogue_nodes.actions IS 'JSON array: [{type: "ACCEPT_QUEST", questId: 1}]';

-- ============================================================================
-- 6. Create helper views
-- ============================================================================

-- View: Available quests for a user
CREATE OR REPLACE VIEW v_available_quests AS
SELECT 
  q.id,
  q.title,
  q.description,
  q.reward_xp,
  q.reward_gold,
  q.category,
  q.prerequisites,
  q.giver_npc_id,
  n.name as giver_npc_name
FROM quests q
LEFT JOIN npcs n ON q.giver_npc_id = n.id
WHERE q.id NOT IN (
  SELECT quest_id FROM user_quests WHERE status IN ('ACTIVE', 'COMPLETED')
);

-- ============================================================================
-- 7. Sample Data: Enhanced quest
-- ============================================================================

-- Example: "Pub Crawler" quest with prerequisites
INSERT INTO quests (
  title, 
  description, 
  reward_xp, 
  reward_gold, 
  category, 
  is_repeatable,
  prerequisites
) VALUES (
  'The Pub Crawler Challenge',
  'Visit 3 different pubs to prove your dedication to the quest!',
  500,
  100,
  'DAILY',
  TRUE,
  '{"minLevel": 2}'::jsonb
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE dialogue_nodes IS 'Node-based conversation system with conditional branching';
