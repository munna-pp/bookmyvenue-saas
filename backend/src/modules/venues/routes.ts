import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { User } from '../auth/models/User.js';
import {
  createVenue,
  updateVenue,
  deleteVenue,
  getVenues,
  getVenueBySlug,
  getOwnerVenues,
  approveVenue,
  rejectVenue,
  suspendVenue,
} from './controller.js';
import { validate } from '../../middleware/validate.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { createVenueSchema, updateVenueSchema } from './dtos.js';


// Self-contained optional auth middleware to support draft previews for owners
const optionalProtect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
      const currentUser = await User.findById(decoded.userId);
      if (currentUser && currentUser.status === 'ACTIVE') {
        req.user = currentUser;
      }
    }
    next();
  } catch {
    next();
  }
};

const router = Router();

// Public Browse Routes
router.get('/venues', optionalProtect, getVenues);
router.get('/venues/:slug', optionalProtect, getVenueBySlug);

// Owner Venue Management Routes
router.post('/venues', protect, restrictTo('owner'), validate(createVenueSchema), createVenue);
router.put('/venues/:id', protect, restrictTo('owner'), validate(updateVenueSchema), updateVenue);
router.delete('/venues/:id', protect, restrictTo('owner'), deleteVenue);
router.get('/owner/venues', protect, restrictTo('owner'), getOwnerVenues);

// Admin Venue Approval Queue Routes
router.patch('/admin/venues/:id/approve', protect, restrictTo('admin'), approveVenue);
router.patch('/admin/venues/:id/reject', protect, restrictTo('admin'), rejectVenue);
router.patch('/admin/venues/:id/suspend', protect, restrictTo('admin'), suspendVenue);

export default router;
