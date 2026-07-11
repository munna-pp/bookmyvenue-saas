import { z } from 'zod';

export const createBookingSchema = z
  .object({
    venueId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid venue identifier format.',
    }),
    eventType: z.string().min(2, 'Event type must be at least 2 characters long').max(50),
    eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Event date must be a valid ISO date format.',
    }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Start time must be in HH:MM 24-hour format.',
    }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'End time must be in HH:MM 24-hour format.',
    }),
    guestCount: z.number().int().min(1, 'Guest count must be at least 1 person'),
    specialRequests: z.string().optional(),
  })
  .refine(
    (data) => {
      // Compare start and end times
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);
      const startVal = startH * 60 + startM;
      const endVal = endH * 60 + endM;
      return endVal > startVal;
    },
    {
      message: 'End time must be chronological after start time.',
      path: ['endTime'],
    }
  );

export const cancelBookingSchema = z.object({
  cancellationReason: z
    .string()
    .min(5, 'Cancellation reason must be at least 5 characters long')
    .optional(),
});

export const adminOverrideSchema = z.object({
  bookingStatus: z.enum([
    'PENDING',
    'OWNER_APPROVED',
    'OWNER_REJECTED',
    'PAYMENT_PENDING',
    'PAID',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'REFUNDED',
  ]),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED']).optional(),
  notes: z.string().optional(),
});
