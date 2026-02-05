const rateLimit = require('express-rate-limit');
const { getRedisClient, isRedisConnected } = require('../config/redis');

/**
 * Custom Redis-backed store for express-rate-limit.
 * Falls back to in-memory counting when Redis is unavailable.
 */
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 60000;
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
    this.localCache = new Map();
  }

  /**
   * Get the current hit count for a key.
   */
  async get(key) {
    const redisKey = this.prefix + key;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const result = await client.get(redisKey);
        if (result !== null) {
          const data = JSON.parse(result);
          return {
            totalHits: data.totalHits,
            resetTime: new Date(data.resetTime),
          };
        }
        return undefined;
      } catch (err) {
        console.error('RedisStore get error:', err.message);
      }
    }

    // Fallback to local cache
    const cached = this.localCache.get(redisKey);
    if (cached && new Date() < new Date(cached.resetTime)) {
      return {
        totalHits: cached.totalHits,
        resetTime: new Date(cached.resetTime),
      };
    }
    return undefined;
  }

  /**
   * Increment the hit count for a key.
   */
  async increment(key) {
    const redisKey = this.prefix + key;
    const now = Date.now();
    const resetTime = new Date(now + this.windowMs);
    const ttlSeconds = Math.ceil(this.windowMs / 1000);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const existing = await client.get(redisKey);

        let totalHits = 1;
        let existingResetTime = resetTime;

        if (existing) {
          const data = JSON.parse(existing);
          totalHits = data.totalHits + 1;
          existingResetTime = new Date(data.resetTime);
        }

        const data = {
          totalHits,
          resetTime: existing ? existingResetTime.toISOString() : resetTime.toISOString(),
        };

        if (!existing) {
          await client.setEx(redisKey, ttlSeconds, JSON.stringify(data));
        } else {
          await client.set(redisKey, JSON.stringify(data), { KEEPTTL: true });
        }

        return {
          totalHits: data.totalHits,
          resetTime: new Date(data.resetTime),
        };
      } catch (err) {
        console.error('RedisStore increment error:', err.message);
      }
    }

    // Fallback to local cache
    const cached = this.localCache.get(redisKey);
    if (cached && new Date() < new Date(cached.resetTime)) {
      cached.totalHits += 1;
      this.localCache.set(redisKey, cached);
      return {
        totalHits: cached.totalHits,
        resetTime: new Date(cached.resetTime),
      };
    }

    const data = { totalHits: 1, resetTime: resetTime.toISOString() };
    this.localCache.set(redisKey, data);

    // Cleanup expired local cache entries periodically
    if (this.localCache.size > 10000) {
      const currentTime = new Date();
      for (const [k, v] of this.localCache) {
        if (currentTime >= new Date(v.resetTime)) {
          this.localCache.delete(k);
        }
      }
    }

    return {
      totalHits: 1,
      resetTime,
    };
  }

  /**
   * Decrement the hit count for a key (used after successful requests in some strategies).
   */
  async decrement(key) {
    const redisKey = this.prefix + key;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const existing = await client.get(redisKey);
        if (existing) {
          const data = JSON.parse(existing);
          data.totalHits = Math.max(0, data.totalHits - 1);
          await client.set(redisKey, JSON.stringify(data), { KEEPTTL: true });
        }
      } catch (err) {
        console.error('RedisStore decrement error:', err.message);
      }
    }

    // Local fallback
    const cached = this.localCache.get(redisKey);
    if (cached) {
      cached.totalHits = Math.max(0, cached.totalHits - 1);
    }
  }

  /**
   * Reset (delete) a key.
   */
  async resetKey(key) {
    const redisKey = this.prefix + key;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.del(redisKey);
      } catch (err) {
        console.error('RedisStore resetKey error:', err.message);
      }
    }

    this.localCache.delete(redisKey);
  }
}

/**
 * General API rate limiter: 100 requests per 15 minutes.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:general:', windowMs: 15 * 60 * 1000 }),
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes',
  },
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
});

/**
 * Auth endpoints rate limiter: 10 attempts per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:auth:', windowMs: 15 * 60 * 1000 }),
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes',
  },
  keyGenerator: (req) => req.ip,
});

/**
 * Chat message rate limiter: 30 messages per minute.
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:chat:', windowMs: 60 * 1000 }),
  message: {
    success: false,
    error: 'Too many messages. Please slow down.',
    retryAfter: '1 minute',
  },
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
});

/**
 * Analytics event rate limiter: 60 events per minute.
 */
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:analytics:', windowMs: 60 * 1000 }),
  message: {
    success: false,
    error: 'Too many events. Please try again later.',
    retryAfter: '1 minute',
  },
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
});

module.exports = {
  RedisStore,
  generalLimiter,
  authLimiter,
  chatLimiter,
  analyticsLimiter,
};
