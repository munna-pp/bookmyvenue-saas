import { EventEmitter } from 'events';
import { getRedisClient } from '../../../config/redis.js';
import { logger } from '../../../utils/logger.js';

class BookingEventsEmitter extends EventEmitter {
  constructor() {
    super();
    // Default listeners for logging events
    this.on('BOOKING_CREATED', (booking) => {
      logger.info(`📢 EVENT [BOOKING_CREATED]: Booking #${booking.bookingNumber} created by Customer ID: ${booking.customerId}`);
    });

    this.on('BOOKING_APPROVED', (booking) => {
      logger.info(`📢 EVENT [BOOKING_APPROVED]: Booking #${booking.bookingNumber} approved by Owner ID: ${booking.ownerId}`);
    });

    this.on('BOOKING_REJECTED', (booking) => {
      logger.info(`📢 EVENT [BOOKING_REJECTED]: Booking #${booking.bookingNumber} rejected by Owner ID: ${booking.ownerId}`);
    });

    this.on('BOOKING_CANCELLED', (booking) => {
      logger.info(`📢 EVENT [BOOKING_CANCELLED]: Booking #${booking.bookingNumber} cancelled by ${booking.cancelledBy}`);
    });
  }
}

export const bookingEvents = new BookingEventsEmitter();

/**
 * Acquire concurrency lock for a venue-date pair to prevent double booking.
 * Returns true if lock was successfully acquired, false otherwise.
 */
export const acquireBookingLock = async (venueId: string, dateStr: string, ttlMs = 5000): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const lockKey = `lock:booking:venue:${venueId}:${dateStr}`;
    
    // Acquire lock using PX + NX parameters
    const result = await redis.set(lockKey, 'locked', 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      logger.info(`🔐 Concurrency lock ACQUIRED for venue: ${venueId} on date: ${dateStr}`);
      return true;
    }
    
    logger.warn(`🚫 Concurrency lock CONFLICT for venue: ${venueId} on date: ${dateStr}`);
    return false;
  } catch (error) {
    logger.error('Error acquiring Redis concurrency lock:', error);
    // Fallback: if Redis fails, do not block the system but log error
    return true;
  }
};

/**
 * Release lock after completion.
 */
export const releaseBookingLock = async (venueId: string, dateStr: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    const lockKey = `lock:booking:venue:${venueId}:${dateStr}`;
    await redis.del(lockKey);
    logger.info(`🔓 Concurrency lock RELEASED for venue: ${venueId} on date: ${dateStr}`);
  } catch (error) {
    logger.error('Error releasing Redis concurrency lock:', error);
  }
};
