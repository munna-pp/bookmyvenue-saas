import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createReviewSchema, updateReviewSchema, ownerReplySchema } from './dtos.js';
import * as controller from './controller.js';

const router = Router();

// Health Check (public)
router.get('/reviews/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'reviews',
    timestamp: new Date().toISOString(),
  });
});

// Fetch Reviews for a specific Venue (public) - maps to /api/v1/venues/:id/reviews
router.get('/venues/:id/reviews', controller.getVenueReviews);

// Protected routes (require user login)
router.get('/owner/reviews', protect, restrictTo('owner'), controller.getOwnerReviews);
router.post('/reviews', protect, validate(createReviewSchema), controller.createReview);
router.put('/reviews/:id', protect, validate(updateReviewSchema), controller.updateReview);
router.delete('/reviews/:id', protect, controller.deleteReview);

// Wishlist endpoints
router.post('/wishlist/:venueId', protect, controller.addToWishlist);
router.delete('/wishlist/:venueId', protect, controller.removeFromWishlist);
router.get('/wishlist', protect, controller.getWishlist);

// Owner reply endpoint
router.post('/reviews/:id/reply', protect, validate(ownerReplySchema), controller.submitOwnerReply);

export default router;
