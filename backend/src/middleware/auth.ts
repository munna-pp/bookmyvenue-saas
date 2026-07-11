import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, IUser } from '../modules/auth/models/User.js';
import { AppError } from './errorHandler.js';

// Extend Express Request type definitions to include the user object
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Middleware to protect routes and verify JWT access tokens.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      next(new AppError('You are not logged in. Please log in to get access.', 401));
      return;
    }

    // 2. Verify token signature
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.userId).select('+password');
    if (!currentUser) {
      next(new AppError('The user belonging to this token no longer exists.', 401));
      return;
    }

    // 4. Check if account is suspended or pending
    if (currentUser.status === 'SUSPENDED') {
      next(new AppError('Your account has been suspended. Please contact support.', 403));
      return;
    }

    // 5. Check if account is locked
    if (currentUser.isLocked()) {
      next(new AppError('This account is temporarily locked. Please try again later.', 403));
      return;
    }

    // Grant access and attach user to request context
    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token. Please log in again.', 401));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Your session has expired. Please log in again.', 401));
      return;
    }
    next(error);
  }
};

/**
 * Middleware to restrict route access based on user role.
 */
export const restrictTo = (...roles: Array<'customer' | 'owner' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('User session not loaded.', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action.', 403));
      return;
    }

    next();
  };
};

/**
 * Middleware to optionally load current user from Authorization token if provided.
 */
export const optionalProtect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    const currentUser = await User.findById(decoded.userId);
    if (currentUser && currentUser.status !== 'SUSPENDED' && !currentUser.isLocked()) {
      req.user = currentUser;
    }
    next();
  } catch {
    next();
  }
};
