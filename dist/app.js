"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const venues_routes_1 = __importDefault(require("./api/venues/venues.routes"));
const quests_routes_1 = __importDefault(require("./api/quests/quests.routes"));
const webhooks_routes_1 = __importDefault(require("./api/webhooks/webhooks.routes"));
const parties_routes_1 = __importDefault(require("./api/parties/parties.routes"));
const auth_routes_1 = __importDefault(require("./api/auth/auth.routes"));
const users_routes_1 = __importDefault(require("./api/users/users.routes"));
const friends_routes_1 = __importDefault(require("./api/friends/friends.routes"));
const npcs_routes_1 = __importDefault(require("./api/npcs/npcs.routes"));
const cms_routes_1 = __importDefault(require("./api/cms/cms.routes"));
const storage_routes_1 = __importDefault(require("./api/storage/storage.routes"));
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const cache_service_1 = require("./services/cache.service");
const storage_service_1 = require("./services/storage.service");
const app = (0, express_1.default)();
// Initialize Redis connection
(0, cache_service_1.getRedisClient)();
// Initialize MinIO buckets
(0, storage_service_1.initializeBuckets)().catch((err) => {
    console.error("Failed to initialize storage buckets:", err);
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Global rate limiter - applies to all routes
app.use(rate_limit_middleware_1.apiLimiter);
// Routes
// Health Check
app.get("/", (req, res) => {
    res.json({ message: "PubQuest API is Online 🍺" });
});
app.use("/api/venues", venues_routes_1.default);
app.use("/api/quests", quests_routes_1.default);
app.use("/api/webhooks", webhooks_routes_1.default);
app.use("/api/parties", parties_routes_1.default);
app.use("/api/auth", rate_limit_middleware_1.authLimiter, auth_routes_1.default); // Stricter rate limit for auth
app.use("/api/users", users_routes_1.default);
app.use("/api/friends", friends_routes_1.default);
app.use("/api/npcs", npcs_routes_1.default);
app.use("/api/cms", cms_routes_1.default); // CMS Admin API
app.use("/api/storage", storage_routes_1.default); // Storage/CDN API
// --- THE MISSING PIECE: START THE SERVER ---
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🍺 Let the Quest begin on port ${PORT}`);
    });
}
exports.default = app;
