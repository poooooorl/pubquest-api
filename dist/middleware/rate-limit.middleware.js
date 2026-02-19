"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensiveOperationLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const cache_service_1 = require("../services/cache.service");
// General API rate limit
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
    // Use Redis store for distributed rate limiting
    store: new rate_limit_redis_1.default({
        sendCommand: async (...args) => (0, cache_service_1.getRedisClient)().call(args[0], ...args.slice(1)),
        prefix: "rl:api:",
    }),
});
// Stricter limit for auth endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    message: "Too many authentication attempts, please try again later.",
    store: new rate_limit_redis_1.default({
        sendCommand: async (...args) => (0, cache_service_1.getRedisClient)().call(args[0], ...args.slice(1)),
        prefix: "rl:auth:",
    }),
});
// Per-user rate limit for expensive operations
exports.expensiveOperationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each user to 10 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: "Rate limit exceeded for this operation.",
    store: new rate_limit_redis_1.default({
        sendCommand: async (...args) => (0, cache_service_1.getRedisClient)().call(args[0], ...args.slice(1)),
        prefix: "rl:expensive:",
    }),
});
