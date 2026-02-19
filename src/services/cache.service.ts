import Redis from "ioredis";

// Redis client singleton
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
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
export const CacheKeys = {
  VENUES_ALL: "venues:all",
  VENUE: (id: number) => `venue:${id}`,
  USER_FRIENDS: (userId: number) => `user:${userId}:friends`,
  USER_PROFILE: (userId: number) => `user:${userId}:profile`,
  NEARBY_VENUES: (lat: number, lng: number, radius: number) =>
    `venues:nearby:${lat}:${lng}:${radius}`,
} as const;

// Generic cache helpers
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Cache GET error:", error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600,
): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error("Cache SET error:", error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (error) {
    console.error("Cache DELETE error:", error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Cache invalidate pattern error:", error);
  }
}
