import { Router } from 'express';
import { optionalProtect, protect, restrictTo } from '../../middleware/auth.js';
import * as controller from './controller.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'search',
    timestamp: new Date().toISOString(),
  });
});

router.get('/venues', optionalProtect, controller.searchVenues);
router.get('/nearby', optionalProtect, controller.getNearbyVenues);
router.get('/suggestions', controller.getSuggestions);
router.get('/recommended', optionalProtect, controller.getRecommendations);
router.get('/trending', controller.getTrending);
router.get('/featured', controller.getFeatured);
router.get('/analytics', protect, restrictTo('admin'), controller.getSearchAnalytics);

export default router;
