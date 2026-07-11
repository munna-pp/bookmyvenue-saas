import { Request, Response, NextFunction } from 'express';
import { Booking, IBooking } from './models/Booking.js';
import { Venue } from '../venues/models/Venue.js';
import { User } from '../auth/models/User.js';
import {
  acquireBookingLock,
  releaseBookingLock,
  bookingEvents,
} from './services/bookingService.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

// State machine helper for valid normal transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['OWNER_APPROVED', 'OWNER_REJECTED', 'CANCELLED'],
  OWNER_APPROVED: ['PAYMENT_PENDING', 'CANCELLED', 'CONFIRMED'],
  OWNER_REJECTED: [],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['CONFIRMED', 'REFUNDED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
  CANCELLED: [],
  COMPLETED: [],
  REFUNDED: [],
};

const checkTransition = (current: string, next: string): boolean => {
  const allowed = VALID_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
};

/**
 * Helper to dynamically stitch venue and user details onto bookings lists (in-memory join)
 */
const populateBookingsMetadata = async (bookings: IBooking[]): Promise<unknown[]> => {
  if (bookings.length === 0) return [];

  const venueIds = Array.from(new Set(bookings.map((b) => b.venueId.toString())));
  const customerIds = Array.from(new Set(bookings.map((b) => b.customerId.toString())));
  const ownerIds = Array.from(new Set(bookings.map((b) => b.ownerId.toString())));

  // Fetch in parallel across separate db connections
  const [venues, customers, owners] = await Promise.all([
    Venue.find({ _id: { $in: venueIds } })
      .select('title slug featuredImage address')
      .lean(),
    User.find({ _id: { $in: customerIds } })
      .select('name email')
      .lean(),
    User.find({ _id: { $in: ownerIds } })
      .select('name email')
      .lean(),
  ]);

  const venueMap = new Map(venues.map((v) => [v._id.toString(), v]));
  const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
  const ownerMap = new Map(owners.map((o) => [o._id.toString(), o]));

  return bookings.map((b) => {
    const bookingObj = b.toObject ? b.toObject() : b;
    (bookingObj as unknown as Record<string, unknown>).venue = venueMap.get(b.venueId.toString()) || null;
    (bookingObj as unknown as Record<string, unknown>).customer = customerMap.get(b.customerId.toString()) || null;
    (bookingObj as unknown as Record<string, unknown>).owner = ownerMap.get(b.ownerId.toString()) || null;
    return bookingObj;
  });
};

/**
 * POST /api/v1/bookings
 * Create booking request (Customer only)
 */
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let lockAcquired = false;
  let dateStr = '';
  const { venueId, eventType, eventDate, startTime, endTime, guestCount, specialRequests } =
    req.body;

  try {
    // 1. Normalize date representing day start (strip hours)
    const normalizedDate = new Date(eventDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    dateStr = normalizedDate.toISOString().slice(0, 10);

    // 2. Prevent race conditions: Acquire Redis concurrency lock for this venue and date
    const locked = await acquireBookingLock(venueId, dateStr, 6000);
    if (!locked) {
      next(
        new AppError(
          'This venue is currently being booked on this date. Please try again shortly.',
          409
        )
      );
      return;
    }
    lockAcquired = true;

    // 3. Verify Venue exists and is active
    const venue = await Venue.findOne({ _id: venueId, isDeleted: false });
    if (!venue) {
      next(new AppError('The requested venue does not exist or has been deleted.', 404));
      return;
    }

    if (venue.approvalStatus !== 'APPROVED' || venue.publicationStatus !== 'PUBLISHED') {
      next(
        new AppError('This venue listing is currently pending approval or is not published.', 400)
      );
      return;
    }

    // 4. Verify Owner is not booking their own venue
    if (venue.ownerId.toString() === req.user!._id.toString()) {
      next(new AppError('Venue owners cannot book their own venues.', 400));
      return;
    }

    // 5. Verify overlapping bookings
    // Check if any active booking overlaps with requested timeslot
    const overlapping = await Booking.findOne({
      venueId,
      eventDate: normalizedDate,
      bookingStatus: { $nin: ['CANCELLED', 'OWNER_REJECTED'] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (overlapping) {
      next(
        new AppError(
          'The requested venue is already booked for this timeslot on the selected date.',
          409
        )
      );
      return;
    }

    // 6. pricing snapshots and calculations
    const snap = {
      pricePerDay: venue.pricing.pricePerDay,
      pricePerHalfDay: venue.pricing.pricePerHalfDay,
      pricePerHour: venue.pricing.pricePerHour,
      securityDeposit: venue.pricing.securityDeposit || 0,
      cleaningFee: venue.pricing.cleaningFee || 0,
    };

    const subtotal = snap.pricePerDay; // For a single day event
    const taxes = Math.round(subtotal * 0.18); // 18% GST standard
    const discount = 0;
    const totalAmount = subtotal + taxes + snap.securityDeposit + snap.cleaningFee - discount;

    // 7. Create booking entry
    const newBooking = await Booking.create({
      customerId: req.user!._id,
      ownerId: venue.ownerId,
      venueId: venue._id,
      eventType,
      eventDate: normalizedDate,
      startTime,
      endTime,
      guestCount,
      specialRequests,
      pricingSnapshot: snap,
      subtotal,
      taxes,
      discount,
      totalAmount,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          updatedAt: new Date(),
          updatedBy: req.user!._id,
          notes: 'Booking query dispatched successfully.',
        },
      ],
    });

    logger.info(`🏛️ Booking requested: #${newBooking.bookingNumber} for Venue ID: ${venueId}`);

    // Emit event
    bookingEvents.emit('BOOKING_CREATED', newBooking);

    res.status(201).json({
      status: 'success',
      data: {
        booking: newBooking,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    // Always release lock
    if (lockAcquired) {
      await releaseBookingLock(venueId, dateStr);
    }
  }
};

/**
 * GET /api/v1/bookings/my
 * Get customer's booking history
 */
export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!._id;
    const query: Record<string, unknown> = { customerId };

    // Filter parameters
    if (req.query.bookingStatus) {
      query.bookingStatus = req.query.bookingStatus;
    }
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    // Pagination
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Booking.countDocuments(query),
    ]);

    const populated = await populateBookingsMetadata(bookings);

    res.status(200).json({
      status: 'success',
      data: {
        bookings: populated,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/owner/bookings
 * Get bookings for venues owned by logged-in user
 */
export const getOwnerBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user!._id;
    const query: Record<string, unknown> = { ownerId };

    if (req.query.bookingStatus) {
      query.bookingStatus = req.query.bookingStatus;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Booking.countDocuments(query),
    ]);

    const populated = await populateBookingsMetadata(bookings);

    res.status(200).json({
      status: 'success',
      data: {
        bookings: populated,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/bookings
 * View all bookings across systems (Admin only)
 */
export const getAdminBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query: Record<string, unknown> = {};

    if (req.query.bookingStatus) {
      query.bookingStatus = req.query.bookingStatus;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Booking.countDocuments(query),
    ]);

    const populated = await populateBookingsMetadata(bookings);

    res.status(200).json({
      status: 'success',
      data: {
        bookings: populated,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/bookings/:id/approve
 * Approve a pending booking (Owner only)
 */
export const approveBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      next(new AppError('Booking query not found.', 404));
      return;
    }

    // Ownership check
    if (booking.ownerId.toString() !== req.user!._id.toString()) {
      next(new AppError('You do not have permission to approve bookings for this venue.', 403));
      return;
    }

    // State machine check
    if (!checkTransition(booking.bookingStatus, 'OWNER_APPROVED')) {
      next(
        new AppError(
          `Invalid state transition from ${booking.bookingStatus} to OWNER_APPROVED.`,
          400
        )
      );
      return;
    }

    booking.bookingStatus = 'OWNER_APPROVED';
    booking.statusHistory.push({
      status: 'OWNER_APPROVED',
      updatedAt: new Date(),
      updatedBy: req.user!._id,
      notes: 'Booking approved by Venue owner.',
    });

    await booking.save();
    logger.info(`✅ Booking APPROVED by Owner: #${booking.bookingNumber}`);

    bookingEvents.emit('BOOKING_APPROVED', booking);

    res.status(200).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/bookings/:id/reject
 * Reject a pending booking (Owner only)
 */
export const rejectBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      next(new AppError('Booking query not found.', 404));
      return;
    }

    // Ownership check
    if (booking.ownerId.toString() !== req.user!._id.toString()) {
      next(new AppError('You do not have permission to reject bookings for this venue.', 403));
      return;
    }

    // State machine check
    if (!checkTransition(booking.bookingStatus, 'OWNER_REJECTED')) {
      next(
        new AppError(
          `Invalid state transition from ${booking.bookingStatus} to OWNER_REJECTED.`,
          400
        )
      );
      return;
    }

    booking.bookingStatus = 'OWNER_REJECTED';
    booking.statusHistory.push({
      status: 'OWNER_REJECTED',
      updatedAt: new Date(),
      updatedBy: req.user!._id,
      notes: 'Booking rejected by Venue owner.',
    });

    await booking.save();
    logger.info(`❌ Booking REJECTED by Owner: #${booking.bookingNumber}`);

    bookingEvents.emit('BOOKING_REJECTED', booking);

    res.status(200).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/bookings/:id/cancel
 * Cancel a booking (Customer, Owner, Admin)
 */
export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      next(new AppError('Booking query not found.', 404));
      return;
    }

    const userId = req.user!._id.toString();
    const userRole = req.user!.role;

    // Check authorization: customer must own the booking, owner must own the venue
    const isCustomerOwner = userRole === 'customer' && booking.customerId.toString() === userId;
    const isVenueOwner = userRole === 'owner' && booking.ownerId.toString() === userId;
    const isAdminUser = userRole === 'admin';

    if (!isCustomerOwner && !isVenueOwner && !isAdminUser) {
      next(new AppError('You do not have permission to cancel this booking.', 403));
      return;
    }

    // State machine check (admins bypass state transitions)
    if (!isAdminUser && !checkTransition(booking.bookingStatus, 'CANCELLED')) {
      next(
        new AppError(`Invalid state transition from ${booking.bookingStatus} to CANCELLED.`, 400)
      );
      return;
    }

    // Determine refund parameters
    const refundEligible = booking.paymentStatus === 'PAID';
    const refundPercentage = refundEligible ? 100 : 0; // Simple refund policy: 100% refund if paid, else 0%

    booking.bookingStatus = 'CANCELLED';
    booking.cancellationReason = cancellationReason || 'Cancelled by user request.';
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user!._id;
    booking.refundEligible = refundEligible;
    booking.refundPercentage = refundPercentage;

    booking.statusHistory.push({
      status: 'CANCELLED',
      updatedAt: new Date(),
      updatedBy: req.user!._id,
      notes: `Booking cancelled. Reason: ${booking.cancellationReason}`,
    });

    await booking.save();
    logger.info(`🚫 Booking CANCELLED: #${booking.bookingNumber} by ${req.user!.email}`);

    bookingEvents.emit('BOOKING_CANCELLED', booking);

    res.status(200).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/bookings/:id/override
 * Admin override status and dispute resolution
 */
export const adminOverrideBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { bookingStatus, paymentStatus, notes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      next(new AppError('Booking not found', 404));
      return;
    }

    booking.bookingStatus = bookingStatus;
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    booking.statusHistory.push({
      status: bookingStatus,
      updatedAt: new Date(),
      updatedBy: req.user!._id,
      notes: notes || 'Admin dispute status override override.',
    });

    await booking.save();
    logger.info(
      `🛠️ Booking status OVERRIDDEN by Admin: #${booking.bookingNumber} to status ${bookingStatus}`
    );

    res.status(200).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/venues/:id/calendar
 * Return booked, blocked, and available slots for a venue
 */
export const getVenueCalendar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    const venue = await Venue.findOne({ _id: id, isDeleted: false });
    if (!venue) {
      next(new AppError('Venue listing not found', 404));
      return;
    }

    // Default 30-day range
    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date();
    if (!end) {
      endDate.setDate(startDate.getDate() + 30);
    }

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    // Retrieve active bookings
    const bookings = await Booking.find({
      venueId: id,
      eventDate: { $gte: startDate, $lte: endDate },
      bookingStatus: { $nin: ['CANCELLED', 'OWNER_REJECTED'] },
    })
      .select('eventDate startTime endTime bookingStatus bookingNumber')
      .lean();

    // Map booked slots
    const bookedSlots = bookings.map((b) => ({
      date: new Date(b.eventDate).toISOString().slice(0, 10),
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.bookingStatus,
      bookingNumber: b.bookingNumber,
    }));

    // Map blocked manual slots
    const blockedSlots = venue.availability
      .filter((av) => {
        const avStart = new Date(av.start);
        const avEnd = new Date(av.end);
        return avStart <= endDate && avEnd >= startDate;
      })
      .map((av) => ({
        startDate: new Date(av.start).toISOString().slice(0, 10),
        endDate: new Date(av.end).toISOString().slice(0, 10),
        reason: av.reason,
      }));

    res.status(200).json({
      status: 'success',
      data: {
        booked: bookedSlots,
        blocked: blockedSlots,
      },
    });
  } catch (error) {
    next(error);
  }
};
