import { Request, Response, NextFunction } from 'express';
import { executeSearch, executeNearbySearch, executeSuggestionsAutocomplete } from './services/searchService.js';
import { searchQuerySchema, nearbyQuerySchema } from './dtos.js';
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

/**
 * GET /api/v1/search/nearby
 * Geospatial search matching venues within radius of lat/lng coordinates
 */
export const getNearbyVenues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = nearbyQuerySchema.parse(req.query);
    const { venues, total } = await executeNearbySearch(validated);

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
    logger.error('❌ Error executing geo search controller:', error);
    next(error);
  }
};

/**
 * GET /api/v1/search/suggestions
 * Instant autocomplete suggestions matching partial query on titles, cities, or types
 */
export const getSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q = '' } = req.query;
    const suggestions = await executeSuggestionsAutocomplete(q as string);

    res.status(200).json({
      status: 'success',
      data: {
        suggestions,
      },
    });
  } catch (error) {
    logger.error('❌ Error executing suggestions autocomplete controller:', error);
    next(error);
  }
};
