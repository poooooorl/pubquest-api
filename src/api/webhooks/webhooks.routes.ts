import { Router } from "express";
import { handleTransactionWebhook } from "@/api/webhooks/webhooks.controller";

const router = Router();

// POST /api/webhooks/transaction
router.post("/transaction", handleTransactionWebhook);

export default router;
