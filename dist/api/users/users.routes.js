"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const users_controller_1 = require("../../api/users/users.controller");
const router = (0, express_1.Router)();
// Get all users (paginated, searchable)
router.get("/", auth_middleware_1.authenticateToken, users_controller_1.getUsers);
// POST /api/users/heartbeat
router.post("/heartbeat", auth_middleware_1.authenticateToken, users_controller_1.heartbeat);
// PATCH /api/users/location
router.patch("/location", auth_middleware_1.authenticateToken, users_controller_1.updateLocation);
// POST /api/users/checkout
router.post("/checkout", auth_middleware_1.authenticateToken, users_controller_1.checkout);
// GET /api/users/history
router.get("/history", auth_middleware_1.authenticateToken, users_controller_1.getCheckInHistory);
// GET /api/users/ledger
router.get("/ledger", auth_middleware_1.authenticateToken, users_controller_1.getLedgerHistory);
// GET /api/users/:id (Get single user by ID) - MUST come after specific routes
router.get("/:id", auth_middleware_1.authenticateToken, users_controller_1.getUserById);
exports.default = router;
