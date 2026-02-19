"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhooks_controller_1 = require("../../api/webhooks/webhooks.controller");
const router = (0, express_1.Router)();
// POST /api/webhooks/transaction
router.post("/transaction", webhooks_controller_1.handleTransactionWebhook);
exports.default = router;
