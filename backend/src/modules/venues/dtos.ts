import { z } from 'zod';

export const createVenueSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  venueType: z.enum([
    'wedding_hall',
    'convention_center',
    'banquet_hall',
    'birthday_venue',
    'resort',
    'meeting_room',
    'sports_ground',
    'farm_house',
    'event_space',
  ]),
  category: z.string().min(2, 'Category is required'),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  location: z.object({
    coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
  }),
  capacity: z.number().int().min(1, 'Capacity must be at least 1 person'),
  pricing: z.object({
    pricePerDay: z.number().min(0, 'Price per day must be positive'),
    pricePerHalfDay: z.number().min(0).optional(),
    pricePerHour: z.number().min(0).optional(),
    securityDeposit: z.number().min(0).optional(),
    cleaningFee: z.number().min(0).optional(),
  }),
  amenities: z.array(z.string()).default([]),
  policies: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]), // Base64 data strings or existing URLs
  featuredImage: z.string().optional(),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export const updateVenueSchema = createVenueSchema.partial();
