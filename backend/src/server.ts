import app from './app.js';
import { config } from './config/index.js';
import { initializeDatabases, closeDatabases } from './config/db.js';
import { getRedisClient, closeRedis } from './config/redis.js';
import { seedAdmin } from './config/seed.js';
import { logger } from './utils/logger.js';
import { Server } from 'http';

let server: Server;

const startServer = async () => {
  try {
    logger.info('🚀 Starting BookMyVenue backend modular monolith...');

    // 1. Initialize DB connections
    await initializeDatabases();

    // Seed default admin user for development
    await seedAdmin();

    // 2. Initialize Redis client
    getRedisClient();

    // 3. Listen on port
    server = app.listen(config.PORT, () => {
      logger.info(`✨ Service listening on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });

  } catch (error) {
    logger.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }

  try {
    await closeDatabases();
    await closeRedis();
    logger.info('Graceful shutdown completed successfully. Exiting.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log and let the app continue, or exit if database connection was lost
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  handleShutdown('uncaughtException');
});

startServer();
