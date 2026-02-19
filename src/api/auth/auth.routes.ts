import { Router } from "express";
import { register, login, getMe } from "@/api/auth/auth.controller";
import { authenticateToken } from "@/middleware/auth.middleware"; // <--- Import Middleware

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);

export default router;
