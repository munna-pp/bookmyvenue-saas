import { Notification, INotification } from '../models/Notification.js';
import { sendRealtimeNotification } from './socketService.js';
import * as emailService from './emailService.js';
import { authEvents, venueEvents } from '../../../utils/events.js';
import { bookingEvents } from '../../bookings/services/bookingService.js';
import { paymentEvents } from '../../payments/services/paymentService.js';
import { User } from '../../auth/models/User.js';
import { Venue } from '../../venues/models/Venue.js';
import { logger } from '../../../utils/logger.js';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'BOOKING_ALERT' | 'PAYMENT_ALERT' | 'VENUE_ALERT' | 'ADMIN_ALERT';
}

/**
 * Centralized function to create an in-app notification,
 * persist to MongoDB, and dispatch over Socket.IO.
 */
export const createNotification = async (params: CreateNotificationParams): Promise<INotification | null> => {
  try {
    logger.info(`🔔 Creating notification: [${params.type}] for user ${params.userId} - "${params.title}"`);
    
    // Save to Database
    const notification = await Notification.create({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      read: false,
    });

    // Send via Socket.IO for realtime delivery
    sendRealtimeNotification(params.userId, {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (error) {
    logger.error('❌ Failed to create notification:', error);
    return null;
  }
};

/**
 * Initialize and bind listeners to central event emitters.
 */
export const initializeNotificationListeners = (): void => {
  logger.info('🔔 Subscribing to event emitters in Notification Module...');

  // ==========================================
  // 1. AUTHENTICATION / USER ACTIONS EVENTS
  // ==========================================
  authEvents.on('USER_REGISTERED', async (user: any) => {
    logger.info(`🔔 Event [USER_REGISTERED]: Processing notification/email for ${user.email}`);
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
      
      if (user.verificationToken) {
        await emailService.sendVerificationEmail(user.email, user.name, user.verificationToken);
      }
    } catch (err) {
      logger.error('❌ Error handling USER_REGISTERED event:', err);
    }
  });

  authEvents.on('VERIFICATION_EMAIL_REQUESTED', async (user: any) => {
    logger.info(`🔔 Event [VERIFICATION_EMAIL_REQUESTED]: Sending code to ${user.email}`);
    try {
      if (user.verificationToken) {
        await emailService.sendVerificationEmail(user.email, user.name, user.verificationToken);
      }
    } catch (err) {
      logger.error('❌ Error handling VERIFICATION_EMAIL_REQUESTED event:', err);
    }
  });

  authEvents.on('PASSWORD_RESET_REQUESTED', async (user: any) => {
    logger.info(`🔔 Event [PASSWORD_RESET_REQUESTED]: Sending reset token to ${user.email}`);
    try {
      if (user.passwordResetToken) {
        await emailService.sendForgotPasswordEmail(user.email, user.name, user.passwordResetToken);
      }
    } catch (err) {
      logger.error('❌ Error handling PASSWORD_RESET_REQUESTED event:', err);
    }
  });

  // ==========================================
  // 2. VENUE ACTIONS EVENTS
  // ==========================================
  venueEvents.on('VENUE_APPROVED', async ({ venue, owner }: any) => {
    logger.info(`🔔 Event [VENUE_APPROVED]: Processing alert for venue "${venue.title}"`);
    try {
      await createNotification({
        userId: owner._id.toString(),
        title: 'Venue Listing Approved!',
        message: `Your venue listing for "${venue.title}" has been reviewed and approved by the system administrators.`,
        type: 'VENUE_ALERT',
      });
      await emailService.sendVenueApprovedEmail(owner.email, owner.name, venue.title);
    } catch (err) {
      logger.error('❌ Error handling VENUE_APPROVED event:', err);
    }
  });

  venueEvents.on('VENUE_REJECTED', async ({ venue, owner, reason }: any) => {
    logger.info(`🔔 Event [VENUE_REJECTED]: Processing alert for venue "${venue.title}"`);
    try {
      await createNotification({
        userId: owner._id.toString(),
        title: 'Venue Listing Request Declined',
        message: `Your venue listing for "${venue.title}" was declined during review. Reason: ${reason || 'N/A'}`,
        type: 'VENUE_ALERT',
      });
      await emailService.sendVenueRejectedEmail(owner.email, owner.name, venue.title, reason);
    } catch (err) {
      logger.error('❌ Error handling VENUE_REJECTED event:', err);
    }
  });

  // ==========================================
  // 3. BOOKING ENGINE EVENTS
  // ==========================================
  bookingEvents.on('BOOKING_CREATED', async (booking: any) => {
    logger.info(`🔔 Event [BOOKING_CREATED]: Dispatching notification triggers for booking #${booking.bookingNumber}`);
    try {
      const customer = await User.findById(booking.customerId);
      const owner = await User.findById(booking.ownerId);
      const venue = await Venue.findById(booking.venueId);

      if (!customer || !owner || !venue) {
        logger.error(`❌ Event [BOOKING_CREATED]: Missing Customer/Owner/Venue for booking #${booking.bookingNumber}`);
        return;
      }

      // Send Alert to Owner (New Booking query received)
      await createNotification({
        userId: owner._id.toString(),
        title: 'New Booking Request',
        message: `You have received a new booking query #${booking.bookingNumber} for "${venue.title}" on event date ${new Date(booking.eventDate).toLocaleDateString()}.`,
        type: 'BOOKING_ALERT',
      });
      await emailService.sendBookingRequestEmail(owner.email, owner.name, booking.bookingNumber, venue.title, booking.eventDate);

      // Send Confirmation to Customer
      await createNotification({
        userId: customer._id.toString(),
        title: 'Booking Request Submitted',
        message: `Your booking query #${booking.bookingNumber} for "${venue.title}" has been successfully submitted and is pending host approval.`,
        type: 'BOOKING_ALERT',
      });
    } catch (err) {
      logger.error('❌ Error handling BOOKING_CREATED event:', err);
    }
  });

  bookingEvents.on('BOOKING_APPROVED', async (booking: any) => {
    logger.info(`🔔 Event [BOOKING_APPROVED]: Dispatching alerts for #${booking.bookingNumber}`);
    try {
      const customer = await User.findById(booking.customerId);
      const venue = await Venue.findById(booking.venueId);

      if (!customer || !venue) {
        logger.error(`❌ Event [BOOKING_APPROVED]: Missing Customer/Venue for booking #${booking.bookingNumber}`);
        return;
      }

      await createNotification({
        userId: customer._id.toString(),
        title: 'Booking Approved!',
        message: `Your booking query #${booking.bookingNumber} for "${venue.title}" has been approved by the host. Please complete the payment to secure your slot.`,
        type: 'BOOKING_ALERT',
      });
      await emailService.sendBookingApprovedEmail(customer.email, customer.name, booking.bookingNumber, venue.title, booking.eventDate);
    } catch (err) {
      logger.error('❌ Error handling BOOKING_APPROVED event:', err);
    }
  });

  bookingEvents.on('BOOKING_REJECTED', async (booking: any) => {
    logger.info(`🔔 Event [BOOKING_REJECTED]: Dispatching alerts for #${booking.bookingNumber}`);
    try {
      const customer = await User.findById(booking.customerId);
      const venue = await Venue.findById(booking.venueId);

      if (!customer || !venue) {
        logger.error(`❌ Event [BOOKING_REJECTED]: Missing Customer/Venue for booking #${booking.bookingNumber}`);
        return;
      }

      await createNotification({
        userId: customer._id.toString(),
        title: 'Booking Declined',
        message: `Your booking query #${booking.bookingNumber} for "${venue.title}" was declined by the host. Reason: ${booking.cancellationReason || 'N/A'}.`,
        type: 'BOOKING_ALERT',
      });
      await emailService.sendBookingRejectedEmail(customer.email, customer.name, booking.bookingNumber, venue.title, booking.eventDate, booking.cancellationReason);
    } catch (err) {
      logger.error('❌ Error handling BOOKING_REJECTED event:', err);
    }
  });

  bookingEvents.on('BOOKING_CANCELLED', async (booking: any) => {
    logger.info(`🔔 Event [BOOKING_CANCELLED]: Dispatching alerts for #${booking.bookingNumber}`);
    try {
      const customer = await User.findById(booking.customerId);
      const owner = await User.findById(booking.ownerId);
      const venue = await Venue.findById(booking.venueId);

      if (!customer || !owner || !venue) {
        logger.error(`❌ Event [BOOKING_CANCELLED]: Missing Customer/Owner/Venue for booking #${booking.bookingNumber}`);
        return;
      }

      const isCustomer = booking.cancelledBy === 'customer';
      const recipient = isCustomer ? owner : customer;
      const recipientName = isCustomer ? owner.name : customer.name;
      const recipientEmail = isCustomer ? owner.email : customer.email;

      await createNotification({
        userId: recipient._id.toString(),
        title: 'Booking Cancelled',
        message: `Booking #${booking.bookingNumber} for "${venue.title}" has been cancelled.`,
        type: 'BOOKING_ALERT',
      });
      await emailService.sendBookingCancelledEmail(
        recipientEmail,
        recipientName,
        booking.bookingNumber,
        venue.title,
        booking.eventDate,
        isCustomer ? 'Customer' : 'Owner',
        booking.cancellationReason
      );
    } catch (err) {
      logger.error('❌ Error handling BOOKING_CANCELLED event:', err);
    }
  });

  // ==========================================
  // 4. PAYMENTS ENGINE EVENTS
  // ==========================================
  paymentEvents.on('PAYMENT_SUCCESS', async (payment: any) => {
    logger.info(`🔔 Event [PAYMENT_SUCCESS]: Dispatching alerts for transaction: ${payment.providerPaymentId}`);
    try {
      const customer = await User.findById(payment.customerId);
      const BookingModel = payment.db.model('Booking');
      const booking = await BookingModel.findById(payment.bookingId);

      if (!customer || !booking) {
        logger.error(`❌ Event [PAYMENT_SUCCESS]: Missing Customer/Booking for payment: ${payment._id}`);
        return;
      }

      // Fetch invoice context
      const InvoiceModel = payment.db.model('Invoice');
      const invoice = await InvoiceModel.findOne({ bookingId: booking._id });
      const invoiceNumber = invoice ? invoice.invoiceNumber : 'N/A';

      // Notify Customer
      await createNotification({
        userId: customer._id.toString(),
        title: 'Payment Successful',
        message: `Your payment of ₹${payment.amount} for booking #${booking.bookingNumber} was verified successfully. Your booking is now CONFIRMED.`,
        type: 'PAYMENT_ALERT',
      });
      await emailService.sendPaymentSuccessfulEmail(customer.email, customer.name, booking.bookingNumber, payment.amount, invoiceNumber);

      // Notify Host (Owner gets wallet credit alert)
      await createNotification({
        userId: booking.ownerId.toString(),
        title: 'Payment Received (Wallet Credited)',
        message: `A payment of ₹${payment.amount} was received for booking #${booking.bookingNumber}. Your wallet balance has been credited.`,
        type: 'PAYMENT_ALERT',
      });
    } catch (err) {
      logger.error('❌ Error handling PAYMENT_SUCCESS event:', err);
    }
  });

  paymentEvents.on('PAYMENT_REFUNDED', async (payment: any) => {
    logger.info(`🔔 Event [PAYMENT_REFUNDED]: Dispatching alerts for payment: ${payment.providerPaymentId}`);
    try {
      const customer = await User.findById(payment.customerId);
      const BookingModel = payment.db.model('Booking');
      const booking = await BookingModel.findById(payment.bookingId);

      if (!customer || !booking) {
        logger.error(`❌ Event [PAYMENT_REFUNDED]: Missing Customer/Booking for payment: ${payment._id}`);
        return;
      }

      // Notify Customer
      await createNotification({
        userId: customer._id.toString(),
        title: 'Refund Processed',
        message: `A refund of ₹${payment.amount} has been successfully processed for booking #${booking.bookingNumber}.`,
        type: 'PAYMENT_ALERT',
      });
      await emailService.sendRefundProcessedEmail(customer.email, customer.name, booking.bookingNumber, payment.amount);

      // Notify Owner
      await createNotification({
        userId: booking.ownerId.toString(),
        title: 'Payment Refunded (Wallet Debited)',
        message: `The payment for booking #${booking.bookingNumber} has been refunded. Your wallet balance was debited accordingly.`,
        type: 'PAYMENT_ALERT',
      });
    } catch (err) {
      logger.error('❌ Error handling PAYMENT_REFUNDED event:', err);
    }
  });
};
