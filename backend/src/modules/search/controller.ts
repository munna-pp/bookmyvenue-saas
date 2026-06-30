import { Request, Response, NextFunction } from 'express';
import { executeSearch, executeNearbySearch, executeSuggestionsAutocomplete, executeRecommendations, executeGetSearchAnalytics, executeGetTrending, executeGetFeatured } from './services/searchService.js';
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

/**
 * GET /api/v1/search/recommended
 * Fetch user-tailored recommendations based on bookings/wishlist/history
 */
export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id?.toString();
    const { limit = 6 } = req.query;
    const limitNum = Math.max(1, parseInt(limit as string, 10));

    const recommendations = await executeRecommendations(customerId, limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        venues: recommendations,
      },
    });
  } catch (error) {
    logger.error('❌ Error executing recommendations controller:', error);
    next(error);
  }
};

/**
 * GET /api/v1/search/analytics
 * Compile search analytics statistics (Admin only)
 */
export const getSearchAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await executeGetSearchAnalytics();
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    logger.error('❌ Error getting search analytics:', error);
    next(error);
  }
};

/**
 * GET /api/v1/search/trending
 * Get trending keywords and venues
 */
export const getTrending = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trending = await executeGetTrending();
    res.status(200).json({
      status: 'success',
      data: trending,
    });
  } catch (error) {
    logger.error('❌ Error getting trending search keywords/venues:', error);
    next(error);
  }
};

/**
 * GET /api/v1/search/featured
 * Get featured venues list
 */
export const getFeatured = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const featured = await executeGetFeatured();
    res.status(200).json({
      status: 'success',
      data: {
        venues: featured,
      },
    });
  } catch (error) {
    logger.error('❌ Error getting featured venues list:', error);
    next(error);
  }
};
