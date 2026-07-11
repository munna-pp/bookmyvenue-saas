import { Request, Response, NextFunction } from 'express';
import { Notification } from './models/Notification.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /api/v1/notifications
 * Get paginated list of notifications for the logged-in user with read/unread filter
 */
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const { read, page = 1, limit = 10 } = req.query;
    const query: Record<string, unknown> = { userId, isDeleted: false };

    // Filter by read/unread if provided
    if (read !== undefined) {
      query.read = read === 'true';
    }

    const pageNumber = Math.max(1, parseInt(page as string, 10));
    const limitNumber = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNumber - 1) * limitNumber;

    logger.info(
      `📋 Fetching notifications for user: ${userId} (page: ${pageNumber}, limit: ${limitNumber}, filter: ${read})`
    );

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNumber).lean(),
      Notification.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    logger.error('❌ Error fetching notifications:', error);
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread
 * Get total unread count of notifications
 */
export const getUnreadNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const count = await Notification.countDocuments({
      userId,
      isDeleted: false,
      read: false,
    });

    res.status(200).json({
      status: 'success',
      data: {
        count,
      },
    });
  } catch (error) {
    logger.error('❌ Error getting unread notifications count:', error);
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a specific notification as read
 */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    logger.info(`🔔 Marking notification ${id} as read for user ${userId}`);

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { read: true },
      { new: true }
    );

    if (!notification) {
      next(new AppError('Notification not found', 404));
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification,
      },
    });
  } catch (error) {
    logger.error('❌ Error marking notification as read:', error);
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications for the user as read
 */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    logger.info(`🔔 Marking all notifications as read for user ${userId}`);

    await Notification.updateMany({ userId, isDeleted: false, read: false }, { read: true });

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.error('❌ Error marking all notifications as read:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/notifications/:id
 * Soft delete a specific notification
 */
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    logger.info(`🗑️ Soft deleting notification ${id} for user ${userId}`);

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      next(new AppError('Notification not found', 404));
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.error('❌ Error deleting notification:', error);
    next(error);
  }
};
