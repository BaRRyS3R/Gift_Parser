// src/lib/redis.ts - Redis client and caching utilities

import { Redis } from "@upstash/redis";

// Initialize Redis client with environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache configuration
export const CACHE_CONFIG = {
  LEADERBOARD: {
    KEY_PREFIX: "leaderboard",
    TTL: 300, // 5 minutes in seconds
  },
  // Future cache configurations can be added here
  TOURNAMENTS: {
    KEY_PREFIX: "tournament",
    TTL: 600, // 10 minutes
  },
  USER_PROFILE: {
    KEY_PREFIX: "profile",
    TTL: 180, // 3 minutes
  },
} as const;

// Cache key generators
export const cacheKeys = {
  /**
   * Generate cache key for all leaderboards
   * Format: leaderboard:all:v1:{limit}
   * v1 - version for cache invalidation if data structure changes
   */
  leaderboard: {
    all: (limit: number) => `${CACHE_CONFIG.LEADERBOARD.KEY_PREFIX}:all:v1:${limit}`,
    // Future individual leaderboard keys if needed
    season: (limit: number) => `${CACHE_CONFIG.LEADERBOARD.KEY_PREFIX}:season:v1:${limit}`,
    reaction: (limit: number) => `${CACHE_CONFIG.LEADERBOARD.KEY_PREFIX}:reaction:v1:${limit}`,
    survival: (limit: number) => `${CACHE_CONFIG.LEADERBOARD.KEY_PREFIX}:survival:v1:${limit}`,
    physics: (limit: number) => `${CACHE_CONFIG.LEADERBOARD.KEY_PREFIX}:physics:v1:${limit}`,
    rotation: (limit: number) => `${CACHE_CONFIG.LEADERBOARD.KEY_PREFIX}:rotation:v1:${limit}`,
  },
  // Future cache keys
  tournament: {
    active: () => `${CACHE_CONFIG.TOURNAMENTS.KEY_PREFIX}:active`,
    byId: (id: string) => `${CACHE_CONFIG.TOURNAMENTS.KEY_PREFIX}:${id}`,
  },
  userProfile: {
    byTelegramId: (telegramId: number) => `${CACHE_CONFIG.USER_PROFILE.KEY_PREFIX}:${telegramId}`,
  },
};

// Cache service with error handling
export const cacheService = {
  /**
   * Get cached data with type safety
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const startTime = Date.now();
      const data = await redis.get<T>(key);
      
      if (data !== null) {
        const duration = Date.now() - startTime;
        console.log(`[Redis] Cache HIT for key: ${key} (${duration}ms)`);
      } else {
        console.log(`[Redis] Cache MISS for key: ${key}`);
      }
      
      return data;
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error);
      // Return null on error to fallback to database
      return null;
    }
  },

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      const startTime = Date.now();
      // Use EX for TTL in seconds
      await redis.set(key, value, { ex: ttl });
      
      const duration = Date.now() - startTime;
      console.log(`[Redis] Cache SET for key: ${key} with TTL: ${ttl}s (${duration}ms)`);
      
      return true;
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error);
      // Return false on error but don't throw to avoid breaking the request
      return false;
    }
  },

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      console.log(`[Redis] Cache DELETE for key: ${key}, result: ${result}`);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern (use with caution)
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      // Note: SCAN operations can be expensive, use sparingly
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`[Redis] No keys found for pattern: ${pattern}`);
        return 0;
      }
      
      // Delete keys in batches to avoid overloading
      const batchSize = 100;
      let deleted = 0;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const result = await redis.del(...batch);
        deleted += result;
      }
      
      console.log(`[Redis] Deleted ${deleted} keys for pattern: ${pattern}`);
      return deleted;
    } catch (error) {
      console.error(`[Redis] Error deleting by pattern ${pattern}:`, error);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Error checking existence of key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const ttl = await redis.ttl(key);
      return ttl;
    } catch (error) {
      console.error(`[Redis] Error getting TTL for key ${key}:`, error);
      return -1;
    }
  },

  /**
   * Increment a counter (useful for rate limiting)
   */
  async incr(key: string): Promise<number | null> {
    try {
      const value = await redis.incr(key);
      return value;
    } catch (error) {
      console.error(`[Redis] Error incrementing key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Error setting expiration for key ${key}:`, error);
      return false;
    }
  },
};

// Cache statistics for monitoring
export const cacheStats = {
  async getInfo(): Promise<{
    dbSize: number;
    memory: string;
    connected: boolean;
  } | null> {
    try {
      // Get database size
      const dbSize = await redis.dbsize();
      
      // Check connection
      const pingResult = await redis.ping();
      const connected = pingResult === "PONG";
      
      return {
        dbSize,
        memory: "N/A", // Memory info not available in Upstash free tier
        connected,
      };
    } catch (error) {
      console.error("[Redis] Error getting stats:", error);
      return null;
    }
  },
};

// Utility function for cache-aside pattern
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
  options?: {
    forceRefresh?: boolean;
    returnStale?: boolean;
  }
): Promise<T> {
  const { forceRefresh = false, returnStale = false } = options || {};
  
  // Skip cache if force refresh
  if (!forceRefresh) {
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  }
  
  try {
    // Fetch fresh data
    const freshData = await fetcher();
    
    // Set cache asynchronously (don't wait for it)
    cacheService.set(key, freshData, ttl).catch((error) => {
      console.error(`[Redis] Failed to cache data for key ${key}:`, error);
    });
    
    return freshData;
  } catch (error) {
    // If fetching fails and returnStale is true, try to return stale cache
    if (returnStale) {
      const staleCache = await cacheService.get<T>(key);
      if (staleCache !== null) {
        console.warn(`[Redis] Returning stale cache for key ${key} due to fetch error`);
        return staleCache;
      }
    }
    
    throw error;
  }
}

// Export Redis client for direct access if needed
export { redis };

// Export types
export type CacheKey = ReturnType<typeof cacheKeys.leaderboard.all> | 
                      ReturnType<typeof cacheKeys.tournament.active> |
                      ReturnType<typeof cacheKeys.userProfile.byTelegramId>;