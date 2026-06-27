import { z } from 'zod';

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code cannot be empty'),
  bookingId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID format'),
});

export const createOrderSchema = z.object({
  bookingId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID format'),
  couponCode: z.string().trim().optional(),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID format'),
  providerOrderId: z.string().trim().min(1, 'providerOrderId is required'),
  providerPaymentId: z.string().trim().min(1, 'providerPaymentId is required'),
  providerSignature: z.string().trim().min(1, 'providerSignature is required'),
});
