import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';

let io: Server | null = null;

export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        logger.warn(
          `🔌 Connection rejected: No authentication token found on socket: ${socket.id}`
        );
        return next(new Error('Authentication error: Token required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token as string, config.JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };

      // Attach user details to socket instance
      socket.data = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      logger.error(`🔌 Connection authentication failed on socket: ${socket.id}`, error);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, role } = socket.data;

    // Join a private room unique to this user ID
    socket.join(userId);
    logger.info(
      `🔌 Socket.IO client connected: userId=${userId}, role=${role}, socketId=${socket.id}`
    );

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket.IO client disconnected: userId=${userId}, socketId=${socket.id}`);
    });
  });

  return io;
};

/**
 * Emit a realtime notification event to a specific user
 */
export const sendRealtimeNotification = (userId: string, notification: unknown): void => {
  if (!io) {
    logger.warn('🔌 Socket.IO is not initialized. Cannot dispatch realtime notification.');
    return;
  }

  logger.info(`🔌 Dispatching realtime notification event to user room: ${userId}`);
  io.to(userId).emit('notification', notification);
};
