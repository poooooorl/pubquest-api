-- ============================================================================
-- Migration 004: Add conditional_texts for context-aware greeting variants
-- ============================================================================
-- This enables a single root node to have multiple text variants based on
-- conditions (quest state, level, items, etc.) without creating duplicate nodes
-- ============================================================================

ALTER TABLE dialogue_nodes 
ADD COLUMN IF NOT EXISTS conditional_texts JSONB;

COMMENT ON COLUMN dialogue_nodes.conditional_texts IS 'Array of conditional text variants: [{"text": "...", "return_text": "...", "conditions": {...}}]';

-- Example structure:
-- conditional_texts: [
--   {
--     "text": "Hey cellar dweller! How is it down there?",
--     "return_text": "How's the restocking going?",
--     "conditions": {"questState": {"questId": 3, "state": "ACTIVE"}}
--   }
-- ]
