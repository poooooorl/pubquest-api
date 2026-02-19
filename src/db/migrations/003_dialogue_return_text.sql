-- ============================================================================
-- Migration 003: Add return_text and next_node_id for context-aware dialogue
-- ============================================================================
-- This enables nodes to display different text on revisits without creating
-- duplicate nodes, improving scalability and maintainability.
-- 
-- next_node_id: For PLAYER nodes, explicitly defines which NPC node to show next
-- return_text: For NPC nodes, alternate text shown when returning to this node
-- ============================================================================

ALTER TABLE dialogue_nodes 
ADD COLUMN IF NOT EXISTS return_text TEXT,
ADD COLUMN IF NOT EXISTS next_node_id INT REFERENCES dialogue_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dialogue_nodes_next ON dialogue_nodes(next_node_id);

COMMENT ON COLUMN dialogue_nodes.return_text IS 'Alternate text shown when player returns to this node in the same conversation';
COMMENT ON COLUMN dialogue_nodes.next_node_id IS 'For PLAYER nodes: the NPC node to navigate to after this choice is selected';
