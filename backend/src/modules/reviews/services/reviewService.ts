import { Types } from 'mongoose';
import { Review } from '../models/Review.js';
import { Venue } from '../../venues/models/Venue.js';
import { logger } from '../../../utils/logger.js';

/**
 * Aggregate reviews to calculate the average rating and total review counts,
 * and update the target Venue document.
 */
export const recalculateVenueRating = async (venueId: Types.ObjectId | string): Promise<void> => {
  try {
    const targetVenueId = new Types.ObjectId(venueId);

    const stats = await Review.aggregate([
      {
        $match: {
          venueId: targetVenueId,
          isDeleted: false,
          hidden: false,
        },
      },
      {
        $group: {
          _id: '$venueId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    let averageRating = 0;
    let reviewCount = 0;

    if (stats.length > 0) {
      averageRating = Math.round(stats[0].averageRating * 10) / 10; // Round to 1 decimal place
      reviewCount = stats[0].reviewCount;
    }

    logger.info(
      `⭐ Recalculating ratings for venue ${targetVenueId}: averageRating=${averageRating}, reviewCount=${reviewCount}`
    );

    await Venue.updateOne(
      { _id: targetVenueId },
      {
        $set: {
          rating: averageRating,
          reviewCount: reviewCount,
        },
      }
    );
  } catch (error) {
    logger.error(`❌ Failed to recalculate ratings for venue ${venueId}:`, error);
  }
};
