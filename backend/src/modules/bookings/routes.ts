import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  getAdminBookings,
  approveBooking,
  rejectBooking,
  cancelBooking,
  adminOverrideBooking,
  getVenueCalendar,
} from './controller.js';
import { validate } from '../../middleware/validate.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { createBookingSchema, cancelBookingSchema, adminOverrideSchema } from './dtos.js';

const router = Router();

// Public Calendar Endpoint
router.get('/venues/:id/calendar', getVenueCalendar);

// Customer Bookings Endpoints
router.post('/bookings', protect, restrictTo('customer'), validate(createBookingSchema), createBooking);
router.get('/bookings/my', protect, restrictTo('customer'), getMyBookings);

// Owner Bookings Endpoints
router.get('/owner/bookings', protect, restrictTo('owner'), getOwnerBookings);
router.patch('/bookings/:id/approve', protect, restrictTo('owner'), approveBooking);
router.patch('/bookings/:id/reject', protect, restrictTo('owner'), rejectBooking);

// Cancel Booking (accessible by customer/owner/admin, verified in controller)
router.patch('/bookings/:id/cancel', protect, validate(cancelBookingSchema), cancelBooking);

// Admin Bookings Endpoints
router.get('/admin/bookings', protect, restrictTo('admin'), getAdminBookings);
router.patch('/admin/bookings/:id/override', protect, restrictTo('admin'), validate(adminOverrideSchema), adminOverrideBooking);

export default router;
