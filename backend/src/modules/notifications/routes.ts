import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import * as controller from './controller.js';

const router = Router();

// Health check endpoint (public/auth-free if required, or keep simple)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'notifications',
    timestamp: new Date().toISOString(),
  });
});

// Protect all actual business notification routes
router.use(protect);

router.get('/', controller.getNotifications);
router.get('/unread', controller.getUnreadNotifications);
router.patch('/:id/read', controller.markAsRead);
router.patch('/read-all', controller.markAllAsRead);
router.delete('/:id', controller.deleteNotification);

export default router;
