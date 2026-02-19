import { Router } from "express";

import { authenticateToken } from "@/middleware/auth.middleware";
import {
  updateLocation,
  checkout,
  getCheckInHistory,
  getLedgerHistory,
  getUsers,
  getUserById,
  heartbeat,
} from "@/api/users/users.controller";

const router = Router();

// Get all users (paginated, searchable)
router.get("/", authenticateToken, getUsers);

// POST /api/users/heartbeat
router.post("/heartbeat", authenticateToken, heartbeat);

// PATCH /api/users/location
router.patch("/location", authenticateToken, updateLocation);

// POST /api/users/checkout
router.post("/checkout", authenticateToken, checkout);

// GET /api/users/history
router.get("/history", authenticateToken, getCheckInHistory);

// GET /api/users/ledger
router.get("/ledger", authenticateToken, getLedgerHistory);

// GET /api/users/:id (Get single user by ID) - MUST come after specific routes
router.get("/:id", authenticateToken, getUserById);

export default router;
