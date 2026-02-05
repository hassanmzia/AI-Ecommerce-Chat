const { createClient } = require('redis');

let redisClient = null;
let isConnected = false;

/**
 * Create and return the Redis client singleton.
 * @returns {import('redis').RedisClientType}
 */
const getRedisClient = () => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: `redis://:${process.env.REDIS_PASSWORD || 'redis_secure_pass_2024'}@${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6380}`,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: max reconnection attempts reached');
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 200, 5000);
      },
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err.message);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis client connected');
    isConnected = true;
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  redisClient.on('end', () => {
    console.log('Redis client disconnected');
    isConnected = false;
  });

  return redisClient;
};

/**
 * Connect the Redis client.
 * @returns {Promise<boolean>}
 */
const connectRedis = async () => {
  try {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }
    isConnected = true;
    console.log('Redis connected successfully');
    return true;
  } catch (err) {
    console.error('Redis connection failed:', err.message);
    isConnected = false;
    return false;
  }
};

/**
 * Disconnect the Redis client gracefully.
 */
const disconnectRedis = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis disconnected');
  }
};

/**
 * Check whether Redis is currently connected.
 * @returns {boolean}
 */
const isRedisConnected = () => isConnected;

/**
 * Cache helpers
 */
const cacheGet = async (key) => {
  try {
    if (!isConnected) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis cacheGet error:', err.message);
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    if (!isConnected) return false;
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Redis cacheSet error:', err.message);
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    if (!isConnected) return false;
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.error('Redis cacheDel error:', err.message);
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    if (!isConnected) return false;
    const keys = [];
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (err) {
    console.error('Redis cacheDelPattern error:', err.message);
    return false;
  }
};

module.exports = {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
};
