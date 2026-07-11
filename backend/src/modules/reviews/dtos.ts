import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID format'),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(100, 'Title cannot exceed 100 characters'),
  review: z
    .string()
    .min(10, 'Review must be at least 10 characters long')
    .max(2000, 'Review cannot exceed 2000 characters'),
  images: z
    .array(z.string().url('Image must be a valid URL'))
    .max(5, 'Maximum of 5 images allowed')
    .optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(3).max(100).optional(),
  review: z.string().min(10).max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const ownerReplySchema = z.object({
  reply: z
    .string()
    .min(2, 'Reply must be at least 2 characters long')
    .max(1000, 'Reply cannot exceed 1000 characters'),
});
