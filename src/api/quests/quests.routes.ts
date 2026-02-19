import { Router } from "express";
import { checkIn } from "@/api/quests/quests.controller";
import { authenticateToken } from "@/middleware/auth.middleware"; // <--- Import

const router = Router();

// POST /api/quests/checkin
router.post("/checkin", authenticateToken, checkIn);

export default router;
