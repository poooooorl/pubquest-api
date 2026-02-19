import { Router } from "express";
import {
  getAllQuests,
  getQuestById,
  createQuest,
  updateQuest,
  deleteQuest,
  getQuestStats,
} from "./cms.quests.controller";
import {
  getAllNPCs,
  getNPCById,
  createNPC,
  updateNPC,
  deleteNPC,
  assignQuestToNPC,
  removeQuestFromNPC,
} from "./cms.npcs.controller";
import {
  getDialogueNodes,
  getDialogueNode,
  createDialogueNode,
  updateDialogueNode,
  deleteDialogueNode,
} from "./cms.dialogue.controller";

/**
 * CMS API Routes
 * Admin panel endpoints for content management
 */

const router = Router();

// Quest Management
router.get("/quests", getAllQuests);
router.get("/quests/stats", getQuestStats);
router.get("/quests/:id", getQuestById);
router.post("/quests", createQuest);
router.put("/quests/:id", updateQuest);
router.delete("/quests/:id", deleteQuest);

// NPC Management
router.get("/npcs", getAllNPCs);
router.get("/npcs/:id", getNPCById);
router.post("/npcs", createNPC);
router.put("/npcs/:id", updateNPC);
router.delete("/npcs/:id", deleteNPC);

// NPC-Quest Assignments
router.post("/npcs/:id/quests", assignQuestToNPC);
router.delete("/npcs/:npcId/quests/:questId", removeQuestFromNPC);

// Dialogue Management
router.get("/npcs/:npcId/dialogue", getDialogueNodes);
router.get("/dialogue/:nodeId", getDialogueNode);
router.post("/npcs/:npcId/dialogue", createDialogueNode);
router.put("/dialogue/:nodeId", updateDialogueNode);
router.delete("/dialogue/:nodeId", deleteDialogueNode);

export default router;
