"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cms_quests_controller_1 = require("./cms.quests.controller");
const cms_npcs_controller_1 = require("./cms.npcs.controller");
const cms_dialogue_controller_1 = require("./cms.dialogue.controller");
/**
 * CMS API Routes
 * Admin panel endpoints for content management
 */
const router = (0, express_1.Router)();
// Quest Management
router.get("/quests", cms_quests_controller_1.getAllQuests);
router.get("/quests/stats", cms_quests_controller_1.getQuestStats);
router.get("/quests/:id", cms_quests_controller_1.getQuestById);
router.post("/quests", cms_quests_controller_1.createQuest);
router.put("/quests/:id", cms_quests_controller_1.updateQuest);
router.delete("/quests/:id", cms_quests_controller_1.deleteQuest);
// NPC Management
router.get("/npcs", cms_npcs_controller_1.getAllNPCs);
router.get("/npcs/:id", cms_npcs_controller_1.getNPCById);
router.post("/npcs", cms_npcs_controller_1.createNPC);
router.put("/npcs/:id", cms_npcs_controller_1.updateNPC);
router.delete("/npcs/:id", cms_npcs_controller_1.deleteNPC);
// NPC-Quest Assignments
router.post("/npcs/:id/quests", cms_npcs_controller_1.assignQuestToNPC);
router.delete("/npcs/:npcId/quests/:questId", cms_npcs_controller_1.removeQuestFromNPC);
// Dialogue Management
router.get("/npcs/:npcId/dialogue", cms_dialogue_controller_1.getDialogueNodes);
router.get("/dialogue/:nodeId", cms_dialogue_controller_1.getDialogueNode);
router.post("/npcs/:npcId/dialogue", cms_dialogue_controller_1.createDialogueNode);
router.put("/dialogue/:nodeId", cms_dialogue_controller_1.updateDialogueNode);
router.delete("/dialogue/:nodeId", cms_dialogue_controller_1.deleteDialogueNode);
exports.default = router;
