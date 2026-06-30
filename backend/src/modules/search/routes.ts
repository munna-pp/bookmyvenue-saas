import { Router } from 'express';
import { optionalProtect } from '../../middleware/auth.js';
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

export default router;
