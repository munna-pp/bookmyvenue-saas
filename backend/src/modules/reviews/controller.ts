import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Review } from './models/Review.js';
import { Wishlist } from './models/Wishlist.js';
import { Booking } from '../bookings/models/Booking.js';
import { Venue } from '../venues/models/Venue.js';
import { recalculateVenueRating } from './services/reviewService.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

// Helper to sanitize review text and prevent basic XSS script tags
const sanitizeText = (text: string): string => {
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

/**
 * POST /api/v1/reviews
 * Create a new review for a completed booking
 */
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    if (!customerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const { bookingId, rating, title, review, images = [] } = req.body;

    // 1. Verify booking exists, is completed, and belongs to customer
    const booking = await Booking.findOne({
      _id: bookingId,
      customerId,
    });

    if (!booking) {
      next(new AppError('Booking not found or does not belong to you', 404));
      return;
    }

    if (booking.bookingStatus !== 'COMPLETED') {
      next(new AppError('Only completed bookings can be reviewed', 400));
      return;
    }

    // 2. Prevent duplicate reviews for the same booking
    const existingReview = await Review.findOne({
      bookingId,
      isDeleted: false,
    });

    if (existingReview) {
      next(new AppError('A review has already been submitted for this booking', 400));
      return;
    }

    // 3. Create review with sanitization
    logger.info(`✍️ Creating review for venue ${booking.venueId} by customer ${customerId}`);
    const newReview = await Review.create({
      bookingId,
      venueId: booking.venueId,
      customerId,
      rating,
      title: sanitizeText(title),
      review: sanitizeText(review),
      images,
      isVerifiedPurchase: true,
    });

    // 4. Recalculate ratings
    await recalculateVenueRating(booking.venueId);

    res.status(201).json({
      status: 'success',
      data: {
        review: newReview,
      },
    });
  } catch (error) {
    logger.error('❌ Error creating review:', error);
    next(error);
  }
};

/**
 * PUT /api/v1/reviews/:id
 * Edit customer's own review
 */
export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const { id } = req.params;
    const { rating, title, review: reviewText, images } = req.body;

    if (!customerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const review = await Review.findOne({ _id: id, isDeleted: false });

    if (!review) {
      next(new AppError('Review not found', 404));
      return;
    }

    // Owner check
    if (review.customerId.toString() !== customerId.toString()) {
      next(new AppError('You do not have permission to edit this review', 403));
      return;
    }

    logger.info(`✍️ Editing review ${id} by customer ${customerId}`);

    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = sanitizeText(title);
    if (reviewText !== undefined) review.review = sanitizeText(reviewText);
    if (images !== undefined) review.images = images;

    await review.save();

    // Recalculate rating
    await recalculateVenueRating(review.venueId);

    res.status(200).json({
      status: 'success',
      data: {
        review,
      },
    });
  } catch (error) {
    logger.error('❌ Error updating review:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/reviews/:id
 * Soft delete customer's own review
 */
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const { id } = req.params;

    if (!customerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const review = await Review.findOne({ _id: id, isDeleted: false });

    if (!review) {
      next(new AppError('Review not found', 404));
      return;
    }

    // Owner check
    if (review.customerId.toString() !== customerId.toString()) {
      next(new AppError('You do not have permission to delete this review', 403));
      return;
    }

    logger.info(`🗑️ Soft deleting review ${id} by customer ${customerId}`);
    review.isDeleted = true;
    await review.save();

    // Recalculate rating
    await recalculateVenueRating(review.venueId);

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully',
    });
  } catch (error) {
    logger.error('❌ Error deleting review:', error);
    next(error);
  }
};

/**
 * GET /api/v1/venues/:id/reviews
 * Fetch reviews for a specific venue with pagination, sorting, and filters
 */
export const getVenueReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, sortBy = 'newest', page = 1, limit = 10 } = req.query;

    const query: any = {
      venueId: new Types.ObjectId(id),
      isDeleted: false,
      hidden: false,
    };

    if (rating) {
      query.rating = parseInt(rating as string, 10);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    // Sorting options mapping
    let sortOptions: any = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'highest_rating') {
      sortOptions = { rating: -1, createdAt: -1 };
    } else if (sortBy === 'lowest_rating') {
      sortOptions = { rating: 1, createdAt: -1 };
    }

    logger.info(`📋 Fetching reviews for venue: ${id} (page: ${pageNum}, limit: ${limitNum}, sortBy: ${sortBy})`);

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'name')
        .lean(),
      Review.countDocuments(query),
    ]);

    // Star distribution calculation via MongoDB aggregation
    const distribution = await Review.aggregate([
      { $match: { venueId: new Types.ObjectId(id), isDeleted: false, hidden: false } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    const starDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((item) => {
      const ratingKey = item._id as 1 | 2 | 3 | 4 | 5;
      if (ratingKey >= 1 && ratingKey <= 5) {
        starDistribution[ratingKey] = item.count;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        starDistribution,
      },
    });
  } catch (error) {
    logger.error('❌ Error getting venue reviews:', error);
    next(error);
  }
};
