import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User } from './models/User.js';
import { RefreshToken, hashToken } from './models/RefreshToken.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

// Helpers to sign JWT access token
const signAccessToken = (userId: string, email: string, role: string): string => {
  return jwt.sign({ userId, email, role }, config.JWT_SECRET, {
    expiresIn: '15m',
  });
};

/**
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      next(new AppError('A user with this email address already exists', 400));
      return;
    }

    // 2. Generate verification token interface placeholder
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 3. Create user (registered users are ACTIVE but isVerified = false initially)
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      status: 'ACTIVE',
      isVerified: false,
      verificationToken,
    });
    
    // Emit USER_REGISTERED event
    const { authEvents } = await import('../../utils/events.js');
    authEvents.emit('USER_REGISTERED', newUser);

    // Logging verification token to console for local testing/mocking verification
    logger.info(`✉️ Mock email sent to [${email}] with verification token: ${verificationToken}`);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Verification token generated.',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          isVerified: newUser.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email (include password and lock properties)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      next(new AppError('Invalid email or password', 401));
      return;
    }

    // 2. Check if user is locked out
    if (user.isLocked()) {
      const remainingTime = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 1000 / 60);
      next(
        new AppError(
          `This account is temporarily locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`,
          403
        )
      );
      return;
    }

    // 3. Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lock
        logger.warn(`🔒 Account locked: ${email} for 30 minutes`);
      }
      await user.save();

      next(new AppError('Invalid email or password', 401));
      return;
    }

    // Reset lockouts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // 4. Generate tokens
    const accessToken = signAccessToken(
      (user._id as Types.ObjectId).toString(),
      user.email,
      user.role
    );
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');

    // Hash refresh token before saving
    const hashedRefreshToken = hashToken(rawRefreshToken);
    await RefreshToken.create({
      token: hashedRefreshToken,
      userId: user._id as Types.ObjectId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // 5. Send Refresh Token in HTTP-only Cookie
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;

    if (rawRefreshToken) {
      // Hash it and delete from database
      const hashedToken = hashToken(rawRefreshToken);
      await RefreshToken.deleteOne({ token: hashedToken });
    }

    // Clear client cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies.refreshToken;

    if (!rawRefreshToken) {
      next(new AppError('No refresh token provided', 401));
      return;
    }

    // 1. Hash incoming token and look it up
    const hashedIncoming = hashToken(rawRefreshToken);
    const dbToken = await RefreshToken.findOne({ token: hashedIncoming });
    if (!dbToken) {
      // Invalidate cookies for safety
      res.clearCookie('refreshToken');
      next(new AppError('Invalid or expired refresh token', 401));
      return;
    }

    // 2. Verify token is not expired
    if (dbToken.expiresAt.getTime() < Date.now()) {
      await RefreshToken.deleteOne({ _id: dbToken._id });
      res.clearCookie('refreshToken');
      next(new AppError('Refresh token expired. Please login again.', 401));
      return;
    }

    // 3. Find user
    const user = await User.findById(dbToken.userId);
    if (!user || user.status === 'SUSPENDED') {
      await RefreshToken.deleteOne({ _id: dbToken._id });
      res.clearCookie('refreshToken');
      next(new AppError('User not found or suspended', 401));
      return;
    }

    // 4. Token Rotation: Delete old token and issue a new one
    await RefreshToken.deleteOne({ _id: dbToken._id });

    const newAccessToken = signAccessToken(
      (user._id as Types.ObjectId).toString(),
      user.email,
      user.role
    );
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHashedRefreshToken = hashToken(newRawRefreshToken);

    await RefreshToken.create({
      token: newHashedRefreshToken,
      userId: user._id as Types.ObjectId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Update cookie
    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // In production, to prevent email enumeration, we should return a success message
      // even if the email does not exist.
      res.status(200).json({
        status: 'success',
        message: 'If the email exists, a reset link has been dispatched.',
      });
      return;
    }

    // 1. Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash and save to database
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    // Emit PASSWORD_RESET_REQUESTED event
    const { authEvents } = await import('../../utils/events.js');
    authEvents.emit('PASSWORD_RESET_REQUESTED', {
      email: user.email,
      name: user.name,
      passwordResetToken: resetToken,
    });

    // 3. Mock Email dispatch - Log to Winston console
    logger.info(`✉️ Mock email sent to [${email}] with password reset token: ${resetToken}`);

    res.status(200).json({
      status: 'success',
      message: 'Reset token generated and logged to console for testing.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token) {
      next(new AppError('No reset token provided', 400));
      return;
    }

    // 1. Hash presented token
    const hashedResetToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with unexpired token
    const user = await User.findOne({
      passwordResetToken: hashedResetToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      next(new AppError('Token is invalid or has expired', 400));
      return;
    }

    // 3. Update password and reset fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    logger.info(`🔑 Password reset successfully for account: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. You can now login.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user!._id,
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role,
        status: req.user!.status,
        isVerified: req.user!.isVerified,
        lastLogin: req.user!.lastLogin,
      },
    },
  });
};
