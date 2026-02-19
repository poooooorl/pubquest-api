import { Router } from "express";
import { authenticateToken } from "@/middleware/auth.middleware";
import {
  getNPCs,
  getNPCById,
  getNPCQuests,
  acceptQuestFromNPC,
  getNPCDialogue,
  getContextualDialogue,
} from "./npcs.controller";

const router = Router();

// Get all NPCs (with optional filters)
router.get("/", authenticateToken, getNPCs);

// Get specific NPC
router.get("/:id", authenticateToken, getNPCById);

// Get NPC dialogue with quest conditions evaluated
router.get("/:id/dialogue", authenticateToken, getNPCDialogue);

// Get contextual dialogue for a specific node
router.get("/:id/dialogue/:node", authenticateToken, getContextualDialogue);

// Get quests available from NPC
router.get("/:id/quests", authenticateToken, getNPCQuests);

// Accept a quest from NPC
router.post("/:id/quests/accept", authenticateToken, acceptQuestFromNPC);

export default router;
