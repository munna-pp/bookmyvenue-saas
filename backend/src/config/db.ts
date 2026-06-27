import mongoose, { Connection } from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

const connections: Record<string, Connection> = {};

/**
 * Get or create a separate database connection for a specific module
 * to ensure database isolation between domains.
 */
export const getModuleConnection = (moduleName: string): Connection => {
  if (connections[moduleName]) {
    return connections[moduleName];
  }

  // Extract base URI (remove trailing slashes) and append database name
  const baseUri = config.MONGODB_URI.replace(/\/+$/, '');
  const dbName = `bookmyvenue_${moduleName}`;
  
  // Format URI correctly for connection (handle query params if present)
  let dbUri = `${baseUri}/${dbName}`;
  if (baseUri.includes('?')) {
    const [host, query] = baseUri.split('?');
    dbUri = `${host}/${dbName}?${query}`;
  }

  logger.info(`Initializing MongoDB connection for module [${moduleName}]...`);

  const connection = mongoose.createConnection(dbUri);

  connection.on('connected', () => {
    logger.info(`✅ MongoDB connection established for module [${moduleName}] -> db: ${dbName}`);
  });

  connection.on('error', (error) => {
    logger.error(`❌ MongoDB connection error for module [${moduleName}]:`, error);
  });

  connection.on('disconnected', () => {
    logger.warn(`⚠️ MongoDB connection disconnected for module [${moduleName}]`);
  });

  connections[moduleName] = connection;
  return connection;
};

/**
 * Initialize all module connections sequentially at startup
 */
export const initializeDatabases = async (): Promise<void> => {
  const modules = ['auth', 'users', 'venues', 'bookings', 'payments', 'notifications', 'reviews', 'search'];
  for (const moduleName of modules) {
    getModuleConnection(moduleName);
  }
};

/**
 * Close all database connections gracefully
 */
export const closeDatabases = async (): Promise<void> => {
  logger.info('Closing all MongoDB connections...');
  await Promise.all(
    Object.values(connections).map((connection) => connection.close())
  );
  logger.info('All MongoDB connections closed.');
};
