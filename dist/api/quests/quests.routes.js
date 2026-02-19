"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quests_controller_1 = require("../../api/quests/quests.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware"); // <--- Import
const router = (0, express_1.Router)();
// POST /api/quests/checkin
router.post("/checkin", auth_middleware_1.authenticateToken, quests_controller_1.checkIn);
exports.default = router;
