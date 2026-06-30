import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';


// Import modules
import authRouter from './modules/auth/routes.js';
import usersRouter from './modules/users/routes.js';
import venuesRouter from './modules/venues/routes.js';
import bookingsRouter from './modules/bookings/routes.js';
import paymentsRouter from './modules/payments/routes.js';
import notificationsRouter from './modules/notifications/routes.js';
import reviewsRouter from './modules/reviews/routes.js';
import searchRouter from './modules/search/routes.js';

const app: Express = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // We'll configure this properly per env later
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate Limiting
app.use('/api/', apiRateLimiter);

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);

// Global Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'bookmyvenue-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// Mount Feature Modules (Versioned Routes)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1', venuesRouter);
app.use('/api/v1', bookingsRouter);
app.use('/api/v1', paymentsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1', reviewsRouter);
app.use('/api/v1/search', searchRouter);

// Catch 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
