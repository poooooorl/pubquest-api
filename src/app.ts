import express from "express";
import cors from "cors";
import helmet from "helmet";
import venuesRoutes from "@/api/venues/venues.routes";
import questsRoutes from "@/api/quests/quests.routes";
import webhooksRoutes from "@/api/webhooks/webhooks.routes";
import partiesRoutes from "@/api/parties/parties.routes";
import authRoutes from "@/api/auth/auth.routes";
import usersRoutes from "@/api/users/users.routes";
import friendsRoutes from "@/api/friends/friends.routes";
import npcsRoutes from "@/api/npcs/npcs.routes";
import cmsRoutes from "@/api/cms/cms.routes";
import storageRoutes from "@/api/storage/storage.routes";
import { apiLimiter, authLimiter } from "@/middleware/rate-limit.middleware";
import { getRedisClient } from "@/services/cache.service";
import { initializeBuckets } from "@/services/storage.service";

const app = express();

// Initialize Redis connection
getRedisClient();

// Initialize MinIO buckets
initializeBuckets().catch((err) => {
  console.error("Failed to initialize storage buckets:", err);
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global rate limiter - applies to all routes
app.use(apiLimiter);

// Routes

// Health Check
app.get("/", (req, res) => {
  res.json({ message: "PubQuest API is Online 🍺" });
});

app.use("/api/venues", venuesRoutes);
app.use("/api/quests", questsRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/parties", partiesRoutes);
app.use("/api/auth", authLimiter, authRoutes); // Stricter rate limit for auth
app.use("/api/users", usersRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/npcs", npcsRoutes);
app.use("/api/cms", cmsRoutes); // CMS Admin API
app.use("/api/storage", storageRoutes); // Storage/CDN API

// --- THE MISSING PIECE: START THE SERVER ---
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🍺 Let the Quest begin on port ${PORT}`);
  });
}

export default app;
