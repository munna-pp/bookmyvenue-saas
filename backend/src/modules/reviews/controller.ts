import { Request, Response, NextFunction } from 'express';
import { Types, SortOrder } from 'mongoose';
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

    const query: Record<string, unknown> = {
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
    let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'highest_rating') {
      sortOptions = { rating: -1, createdAt: -1 };
    } else if (sortBy === 'lowest_rating') {
      sortOptions = { rating: 1, createdAt: -1 };
    }

    logger.info(
      `📋 Fetching reviews for venue: ${id} (page: ${pageNum}, limit: ${limitNum}, sortBy: ${sortBy})`
    );

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

/**
 * POST /api/v1/wishlist/:venueId
 * Add venue to customer wishlist
 */
export const addToWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const { venueId } = req.params;

    if (!customerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    // Verify venue exists
    const venue = await Venue.findOne({ _id: venueId, isDeleted: false });
    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    logger.info(`❤️ Adding venue ${venueId} to wishlist of customer ${customerId}`);

    // Prevent duplicates using upsert
    const wishlist = await Wishlist.findOneAndUpdate(
      { customerId, venueId },
      { $setOnInsert: { customerId, venueId, createdAt: new Date() } },
      { upsert: true, new: true }
    );

    res.status(201).json({
      status: 'success',
      message: 'Venue added to wishlist successfully',
      data: { wishlist },
    });
  } catch (error) {
    logger.error('❌ Error adding to wishlist:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/wishlist/:venueId
 * Remove venue from customer wishlist
 */
export const removeFromWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const { venueId } = req.params;

    if (!customerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    logger.info(`💔 Removing venue ${venueId} from wishlist of customer ${customerId}`);

    const result = await Wishlist.findOneAndDelete({ customerId, venueId });
    if (!result) {
      next(new AppError('Wishlist entry not found', 404));
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Venue removed from wishlist successfully',
    });
  } catch (error) {
    logger.error('❌ Error removing from wishlist:', error);
    next(error);
  }
};

/**
 * GET /api/v1/wishlist
 * List customer wishlist items with sorting and pagination
 */
export const getWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user?._id;
    const { sortBy = 'newest', page = 1, limit = 10 } = req.query;

    if (!customerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    logger.info(
      `📋 Fetching wishlist items for customer: ${customerId} (page: ${pageNum}, limit: ${limitNum}, sortBy: ${sortBy})`
    );

    // Fetch wishlist entries (sorted newest first by default to align savedDate mapping)
    const wishlistItems = await Wishlist.find({ customerId }).sort({ createdAt: -1 });
    const venueIds = wishlistItems.map((item) => item.venueId);

    if (venueIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          wishlist: [],
          total: 0,
          page: pageNum,
          pages: 1,
        },
      });
      return;
    }

    // Determine sorting options for populated venues
    let sortOptions: { [key: string]: SortOrder } = {};
    if (sortBy === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'highest_rated') {
      sortOptions = { rating: -1 };
    } else if (sortBy === 'lowest_price') {
      sortOptions = { 'pricing.pricePerDay': 1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    const venues = await Venue.find({
      _id: { $in: venueIds },
      isDeleted: false,
    })
      .sort(sortOptions)
      .lean();

    // Map populated venues back to wishlist items to preserve savedDate
    const populated = wishlistItems
      .map((item) => {
        const venue = venues.find((v) => v._id.toString() === item.venueId.toString());
        if (!venue) return null;
        return {
          _id: item._id,
          venueId: item.venueId,
          createdAt: item.createdAt,
          venue,
        };
      })
      .filter((item) => item !== null);

    const total = populated.length;
    const paginated = populated.slice(skip, skip + limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        wishlist: paginated,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('❌ Error fetching wishlist:', error);
    next(error);
  }
};

/**
 * POST /api/v1/reviews/:id/reply
 * Owner reply to a review
 */
export const submitOwnerReply = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?._id;
    const { id } = req.params;
    const { reply } = req.body;

    if (!ownerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const review = await Review.findOne({ _id: id, isDeleted: false });
    if (!review) {
      next(new AppError('Review not found', 404));
      return;
    }

    // Verify user owns the venue
    const venue = await Venue.findById(review.venueId);
    if (!venue) {
      next(new AppError('Venue associated with this review not found', 404));
      return;
    }

    if (venue.ownerId.toString() !== ownerId.toString()) {
      next(new AppError('You do not have permission to reply to this review', 403));
      return;
    }

    logger.info(`💬 Owner ${ownerId} replying to review ${id}`);
    review.ownerReply = {
      reply: sanitizeText(reply),
      repliedAt: new Date(),
    };

    await review.save();

    res.status(200).json({
      status: 'success',
      data: {
        review,
      },
    });
  } catch (error) {
    logger.error('❌ Error submitting owner reply:', error);
    next(error);
  }
};

/**
 * PATCH /api/v1/reviews/:id/hide
 * Hide a review (Admin only)
 */
export const hideReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    logger.info(`🛡️ Admin hiding review ${id}`);

    const review = await Review.findByIdAndUpdate(id, { hidden: true }, { new: true });

    if (!review) {
      next(new AppError('Review not found', 404));
      return;
    }

    // Recalculate ratings
    await recalculateVenueRating(review.venueId);

    res.status(200).json({
      status: 'success',
      message: 'Review hidden successfully',
      data: { review },
    });
  } catch (error) {
    logger.error('❌ Error hiding review:', error);
    next(error);
  }
};

/**
 * PATCH /api/v1/reviews/:id/restore
 * Restore a hidden review (Admin only)
 */
export const restoreReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    logger.info(`🛡️ Admin restoring review ${id}`);

    const review = await Review.findByIdAndUpdate(id, { hidden: false }, { new: true });

    if (!review) {
      next(new AppError('Review not found', 404));
      return;
    }

    // Recalculate ratings
    await recalculateVenueRating(review.venueId);

    res.status(200).json({
      status: 'success',
      message: 'Review restored successfully',
      data: { review },
    });
  } catch (error) {
    logger.error('❌ Error restoring review:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/reviews/:id
 * Permanently delete/purge review (Admin only)
 */
export const purgeReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    logger.info(`🛡️ Admin purging/permanently deleting review ${id}`);

    const review = await Review.findById(id);
    if (!review) {
      next(new AppError('Review not found', 404));
      return;
    }

    const venueId = review.venueId;
    await Review.findByIdAndDelete(id);

    // Recalculate ratings
    await recalculateVenueRating(venueId);

    res.status(200).json({
      status: 'success',
      message: 'Review permanently purged from database successfully',
    });
  } catch (error) {
    logger.error('❌ Error purging review:', error);
    next(error);
  }
};

/**
 * GET /api/v1/reviews
 * Fetch all reviews in the system (Admin only)
 */
export const getAllReviewsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rating, search, page = 1, limit = 10 } = req.query;

    const query: Record<string, unknown> = {
      isDeleted: false,
    };

    if (rating) {
      query.rating = parseInt(rating as string, 10);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { review: { $regex: search as string, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    logger.info(
      `🛡️ Admin fetching all reviews (page: ${pageNum}, limit: ${limitNum}, rating: ${rating})`
    );

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'name')
        .lean(),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('❌ Error getting all reviews for admin:', error);
    next(error);
  }
};

/**
 * GET /api/v1/owner/reviews
 * Fetch all reviews for venues owned by the current host (Owner only)
 */
export const getOwnerReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    if (!ownerId) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    // 1. Fetch all venues owned by this host
    const venues = await Venue.find({ ownerId, isDeleted: false });
    const venueIds = venues.map((v) => v._id);

    if (venueIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          reviews: [],
          total: 0,
          page: 1,
          pages: 1,
        },
      });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    logger.info(
      `📋 Owner ${ownerId} fetching reviews for their venues (page: ${pageNum}, limit: ${limitNum})`
    );

    const [reviews, total] = await Promise.all([
      Review.find({
        venueId: { $in: venueIds },
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'name')
        .lean(),
      Review.countDocuments({
        venueId: { $in: venueIds },
        isDeleted: false,
      }),
    ]);

    // Attach venue titles to the reviews manually to avoid cross-connection populates
    const reviewsWithVenues = reviews.map((r) => {
      const venueObj = venues.find((v) => v._id.toString() === r.venueId.toString());
      return {
        ...r,
        venueTitle: venueObj ? venueObj.title : 'N/A',
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        reviews: reviewsWithVenues,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('❌ Error getting owner reviews:', error);
    next(error);
  }
};
