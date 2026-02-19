"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const npcs_controller_1 = require("./npcs.controller");
const router = (0, express_1.Router)();
// Get all NPCs (with optional filters)
router.get("/", auth_middleware_1.authenticateToken, npcs_controller_1.getNPCs);
// Get specific NPC
router.get("/:id", auth_middleware_1.authenticateToken, npcs_controller_1.getNPCById);
// Get NPC dialogue with quest conditions evaluated
router.get("/:id/dialogue", auth_middleware_1.authenticateToken, npcs_controller_1.getNPCDialogue);
// Get contextual dialogue for a specific node
router.get("/:id/dialogue/:node", auth_middleware_1.authenticateToken, npcs_controller_1.getContextualDialogue);
// Get quests available from NPC
router.get("/:id/quests", auth_middleware_1.authenticateToken, npcs_controller_1.getNPCQuests);
// Accept a quest from NPC
router.post("/:id/quests/accept", auth_middleware_1.authenticateToken, npcs_controller_1.acceptQuestFromNPC);
exports.default = router;
