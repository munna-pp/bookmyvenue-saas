import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  venueType: z.string().optional(),
  category: z.string().optional(),
  capacity: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().min(1).optional()
  ),
  minPrice: z.preprocess(
    (val) => (val ? parseFloat(val as string) : undefined),
    z.number().min(0).optional()
  ),
  maxPrice: z.preprocess(
    (val) => (val ? parseFloat(val as string) : undefined),
    z.number().min(0).optional()
  ),
  rating: z.preprocess(
    (val) => (val ? parseFloat(val as string) : undefined),
    z.number().min(0).max(5).optional()
  ),
  amenities: z.preprocess(
    (val) => {
      if (typeof val === 'string') return val.split(',').map((s) => s.trim());
      if (Array.isArray(val)) return val;
      return undefined;
    },
    z.array(z.string()).optional()
  ),
  featured: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().optional()
  ),
  date: z.string().optional(), // YYYY-MM-DD
  sortBy: z.string().optional(),
  page: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().min(1).default(10)
  ),
});
