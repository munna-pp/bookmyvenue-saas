import { Redis } from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  logger.info('Initializing Redis connection...');

  redisClient = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis client connected successfully');
  });

  redisClient.on('error', (error) => {
    logger.error('❌ Redis client connection error:', error);
  });

  redisClient.on('end', () => {
    logger.warn('⚠️ Redis client connection closed');
  });

  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    logger.info('Disconnecting Redis client...');
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected.');
  }
};
