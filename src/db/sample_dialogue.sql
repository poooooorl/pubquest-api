-- ============================================================================
-- Sample Dialogue Graph Data
-- ============================================================================
-- This demonstrates how to create a conversation tree with conditional branching
-- and quest integration.
--
-- Example: Kat the Serveress at The Brass Monkey
-- ============================================================================

-- Assuming NPC ID 2 = Kat the Serveress
-- Assuming Quest ID 2 = "The Legendary Pint"

-- ============================================================================
-- Root Node: Initial Greeting (Quest Not Started)
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, is_root, conditions, button_text) VALUES
(
  2, -- Kat
  'Hey there, stranger! Welcome to The Brass Monkey. First time here?',
  'NPC',
  TRUE,
  '{"notCompletedQuests": [2]}'::jsonb, -- Show if quest 2 NOT started
  NULL -- Root nodes don't have button text
);

-- Store the ID for reference
-- Let's say this returns id = 1

-- ============================================================================
-- Player Response Options (Children of Root)
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, button_text) VALUES
(
  2,
  'Yes, just passing through.',
  'PLAYER',
  1, -- Parent is the root greeting
  FALSE,
  'Just passing through'
),
(
  2,
  'Actually, I heard you have a quest for me?',
  'PLAYER',
  1,
  FALSE,
  'Tell me about the quest'
);

-- Store IDs: response 1 = id 2, response 2 = id 3

-- ============================================================================
-- NPC Follow-up: Casual Response
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Well, feel free to look around. If you change your mind about that quest, come find me!',
  'NPC',
  2, -- Parent is "just passing through"
  FALSE,
  '[{"type": "END_CONVERSATION"}]'::jsonb,
  NULL
);

-- ============================================================================
-- NPC Follow-up: Quest Introduction
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Ah, you''ve got a keen eye! I''ve been searching for the legendary "Golden Pint" - a mythical drink said to grant incredible charisma. Help me find it, and I''ll make it worth your while!',
  'NPC',
  3, -- Parent is "tell me about quest"
  FALSE,
  NULL,
  NULL
);

-- Store ID = 5

-- ============================================================================
-- Player Choice: Accept or Decline Quest
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Count me in! Where do I start?',
  'PLAYER',
  5,
  FALSE,
  '[{"type": "ACCEPT_QUEST", "questId": 2}]'::jsonb,
  'Accept Quest'
),
(
  2,
  'Sounds interesting, but maybe another time.',
  'PLAYER',
  5,
  FALSE,
  '[{"type": "END_CONVERSATION"}]'::jsonb,
  'Decline'
);

-- IDs: accept = 6, decline = 7

-- ============================================================================
-- NPC Response: Quest Accepted
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Brilliant! Start by visiting three different pubs and asking around. Someone must know something. Oh, and buy a few rounds while you''re at it - people talk more when they''re having a good time!',
  'NPC',
  6,
  FALSE,
  '[{"type": "END_CONVERSATION"}]'::jsonb,
  NULL
);

-- ============================================================================
-- Root Node: Quest In Progress
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, is_root, conditions, button_text) VALUES
(
  2,
  'Back already? How''s the search going?',
  'NPC',
  TRUE,
  '{"questState": {"questId": 2, "state": "ACTIVE"}}'::jsonb,
  NULL
);

-- ID = 9

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Still working on it...',
  'PLAYER',
  9,
  FALSE,
  '[{"type": "END_CONVERSATION"}]'::jsonb,
  'Still searching'
);

-- ============================================================================
-- Root Node: Quest Ready to Turn In
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, is_root, conditions, button_text) VALUES
(
  2,
  'You''re back! Did you find any leads on the Golden Pint?',
  'NPC',
  TRUE,
  '{"questState": {"questId": 2, "state": "READY"}}'::jsonb,
  NULL
);

-- ID = 11

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'I asked around at several pubs. Nobody''s heard of it - I think it''s just a myth.',
  'PLAYER',
  11,
  FALSE,
  '[{"type": "COMPLETE_QUEST", "questId": 2}]'::jsonb,
  'Report findings'
);

-- ============================================================================
-- NPC Response: Quest Completed
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Hmm, a myth, you say? Well, at least we know for sure now. Here, take this for your trouble. You''re a reliable one!',
  'NPC',
  12,
  FALSE,
  '[{"type": "END_CONVERSATION"}]'::jsonb,
  NULL
);

-- ============================================================================
-- Root Node: Quest Completed (Future conversations)
-- ============================================================================

INSERT INTO dialogue_nodes (npc_id, text, speaker, is_root, conditions, button_text) VALUES
(
  2,
  'Good to see you again! Thanks for helping me out with that wild goose chase.',
  'NPC',
  TRUE,
  '{"completedQuests": [2]}'::jsonb,
  NULL
);

INSERT INTO dialogue_nodes (npc_id, text, speaker, parent_node_id, is_root, actions, button_text) VALUES
(
  2,
  'Always happy to help!',
  'PLAYER',
  14,
  FALSE,
  '[{"type": "END_CONVERSATION"}]'::jsonb,
  'Chat'
);

-- ============================================================================
-- Summary of Dialogue Flow
-- ============================================================================
/*
Quest State: NOT STARTED
├─ Root: "Hey there, stranger!"
   ├─ Player: "Just passing through" → End
   └─ Player: "Tell me about the quest"
      └─ NPC: "I'm searching for the Golden Pint!"
         ├─ Player: "Accept Quest" [ACCEPT_QUEST] → NPC: "Start by visiting pubs!" → End
         └─ Player: "Decline" → End

Quest State: ACTIVE
├─ Root: "Back already? How's the search going?"
   └─ Player: "Still working on it..." → End

Quest State: READY
├─ Root: "You're back! Did you find any leads?"
   └─ Player: "Report findings" [COMPLETE_QUEST] → NPC: "Thanks for trying!" → End

Quest State: COMPLETED
├─ Root: "Good to see you again!"
   └─ Player: "Always happy to help!" → End
*/
