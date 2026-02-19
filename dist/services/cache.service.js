"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKeys = void 0;
exports.getRedisClient = getRedisClient;
exports.getCached = getCached;
exports.setCached = setCached;
exports.deleteCached = deleteCached;
exports.invalidatePattern = invalidatePattern;
const ioredis_1 = __importDefault(require("ioredis"));
// Redis client singleton
let redisClient = null;
function getRedisClient() {
    if (!redisClient) {
        redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            lazyConnect: true,
        });
        redisClient.on("error", (err) => {
            console.error("Redis Client Error:", err);
        });
        redisClient.on("connect", () => {
            console.log("✅ Redis Connected");
        });
    }
    return redisClient;
}
// Cache keys constants
exports.CacheKeys = {
    VENUES_ALL: "venues:all",
    VENUE: (id) => `venue:${id}`,
    USER_FRIENDS: (userId) => `user:${userId}:friends`,
    USER_PROFILE: (userId) => `user:${userId}:profile`,
    NEARBY_VENUES: (lat, lng, radius) => `venues:nearby:${lat}:${lng}:${radius}`,
};
// Generic cache helpers
async function getCached(key) {
    try {
        const redis = getRedisClient();
        const cached = await redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (error) {
        console.error("Cache GET error:", error);
        return null;
    }
}
async function setCached(key, value, ttlSeconds = 3600) {
    try {
        const redis = getRedisClient();
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    }
    catch (error) {
        console.error("Cache SET error:", error);
    }
}
async function deleteCached(key) {
    try {
        const redis = getRedisClient();
        await redis.del(key);
    }
    catch (error) {
        console.error("Cache DELETE error:", error);
    }
}
async function invalidatePattern(pattern) {
    try {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
    catch (error) {
        console.error("Cache invalidate pattern error:", error);
    }
}
