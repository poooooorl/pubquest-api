import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "../services/cache.service";

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
  // Use Redis store for distributed rate limiting
  store: new RedisStore({
    sendCommand: async (...args: readonly string[]) =>
      getRedisClient().call(args[0], ...args.slice(1)) as any,
    prefix: "rl:api:",
  }),
});

// Stricter limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  message: "Too many authentication attempts, please try again later.",
  store: new RedisStore({
    sendCommand: async (...args: readonly string[]) =>
      getRedisClient().call(args[0], ...args.slice(1)) as any,
    prefix: "rl:auth:",
  }),
});

// Per-user rate limit for expensive operations
export const expensiveOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each user to 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: "Rate limit exceeded for this operation.",
  store: new RedisStore({
    sendCommand: async (...args: readonly string[]) =>
      getRedisClient().call(args[0], ...args.slice(1)) as any,
    prefix: "rl:expensive:",
  }),
});
