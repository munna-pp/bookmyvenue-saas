import { Request, Response, NextFunction } from 'express';
import { executeSearch } from './services/searchService.js';
import { searchQuerySchema } from './dtos.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * GET /api/v1/search/venues
 * Advanced search with queries, filters, and sorting
 */
export const searchVenues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = searchQuerySchema.parse(req.query);
    const customerId = req.user?._id?.toString();

    const { venues, total } = await executeSearch(validated, customerId);

    res.status(200).json({
      status: 'success',
      data: {
        venues,
        total,
        page: validated.page,
        pages: Math.ceil(total / validated.limit),
      },
    });
  } catch (error) {
    logger.error('❌ Error executing search controller:', error);
    next(error);
  }
};
