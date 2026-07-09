import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { getDatabaseHealth } from '../config/db.js';
import { getRedisClient } from '../config/redis.js';

// Enable collection of default metrics (memory, CPU, event loop, etc.)
client.collectDefaultMetrics({ register: client.register });

// Metric definitions
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

const mongodbHealthGauge = new client.Gauge({
  name: 'mongodb_up',
  help: 'Status of MongoDB database connections (1 = UP, 0 = DOWN)',
});

const redisHealthGauge = new client.Gauge({
  name: 'redis_up',
  help: 'Status of Redis cache connection (1 = UP, 0 = DOWN)',
});

// Middleware to track request counters and durations
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    
    // Normalize path to prevent cardinal explosion (e.g. group IDs)
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const status = res.statusCode.toString();
    
    httpRequestCounter.inc({ method, route, status });
    httpRequestDuration.observe({ method, route, status }, durationInSeconds);
  });
  
  next();
};

// Route handler for GET /metrics
export const metricsEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    // Collect DB health
    const dbHealthy = getDatabaseHealth();
    mongodbHealthGauge.set(dbHealthy ? 1 : 0);
    
    // Collect Redis health
    let redisHealthy = false;
    try {
      const redis = getRedisClient();
      redisHealthy = redis.status === 'ready';
    } catch {
      redisHealthy = false;
    }
    redisHealthGauge.set(redisHealthy ? 1 : 0);
    
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};
