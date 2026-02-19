import { Router } from "express";
import * as dialogueController from "./cms.dialogue.controller";

const router = Router();

// Get all dialogue nodes for an NPC
router.get("/npcs/:npcId/dialogue", dialogueController.getDialogueNodes);

// Get single dialogue node
router.get("/dialogue/:nodeId", dialogueController.getDialogueNode);

// Create dialogue node for an NPC
router.post("/npcs/:npcId/dialogue", dialogueController.createDialogueNode);

// Update dialogue node
router.put("/dialogue/:nodeId", dialogueController.updateDialogueNode);

// Delete dialogue node
router.delete("/dialogue/:nodeId", dialogueController.deleteDialogueNode);

export default router;
