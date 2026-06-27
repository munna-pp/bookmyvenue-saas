import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Venue } from './models/Venue.js';
import { uploadService } from './services/uploadService.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * POST /api/v1/venues
 * Create a new Venue draft/publication (Owner only)
 */
export const createVenue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, venueType, category, address, location, capacity, pricing, amenities, policies, images, publicationStatus } = req.body;

    // 1. Process and upload base64 images
    const uploadedImages: string[] = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        const url = await uploadService.uploadImage(img, 'venues');
        uploadedImages.push(url);
      }
    }

    const featuredImage = uploadedImages.length > 0 ? uploadedImages[0] : undefined;

    // 2. Build GeoJSON point coordinates
    const coordinates = location.coordinates; // [lng, lat]

    // 3. Create Venue document
    const newVenue = await Venue.create({
      ownerId: req.user!._id,
      title,
      description,
      venueType,
      category,
      address,
      city: address.city,
      state: address.state,
      country: address.country,
      location: {
        type: 'Point',
        coordinates,
      },
      capacity,
      pricing,
      amenities,
      policies,
      images: uploadedImages,
      featuredImage,
      approvalStatus: 'PENDING',
      publicationStatus: publicationStatus || 'DRAFT',
      isDeleted: false,
    });

    logger.info(`🏛️ Venue created successfully: ${newVenue.title} (ID: ${newVenue._id})`);

    res.status(201).json({
      status: 'success',
      data: {
        venue: newVenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/venues/:id
 * Update an existing Venue (Owner only)
 */
export const updateVenue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await Venue.findOne({ _id: id, isDeleted: false });
    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    // Authorization check: User must own the venue
    if (venue.ownerId.toString() !== req.user!._id.toString()) {
      next(new AppError('You do not have permission to modify this venue', 403));
      return;
    }

    // Process new images if uploaded as base64
    if (req.body.images && Array.isArray(req.body.images)) {
      const uploadedImages: string[] = [];
      for (const img of req.body.images) {
        const url = await uploadService.uploadImage(img, 'venues');
        uploadedImages.push(url);
      }
      req.body.images = uploadedImages;
      if (uploadedImages.length > 0 && !req.body.featuredImage) {
        req.body.featuredImage = uploadedImages[0];
      }
    }

    // If address is updated, sync city/state/country fields
    if (req.body.address) {
      req.body.city = req.body.address.city;
      req.body.state = req.body.address.state;
      req.body.country = req.body.address.country;
    }

    // If location is updated, format it as GeoJSON Point
    if (req.body.location && req.body.location.coordinates) {
      req.body.location = {
        type: 'Point',
        coordinates: req.body.location.coordinates,
      };
    }

    // Reset approval status back to PENDING on edits
    req.body.approvalStatus = 'PENDING';

    const updatedVenue = await Venue.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info(`🏛️ Venue updated: ${updatedVenue?.title} (ID: ${id})`);

    res.status(200).json({
      status: 'success',
      data: {
        venue: updatedVenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/venues/:id
 * Soft delete a Venue (Owner only)
 */
export const deleteVenue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await Venue.findOne({ _id: id, isDeleted: false });
    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    // User must own the venue to delete it
    if (venue.ownerId.toString() !== req.user!._id.toString()) {
      next(new AppError('You do not have permission to delete this venue', 403));
      return;
    }

    // Perform soft-delete
    venue.isDeleted = true;
    venue.deletedAt = new Date();
    venue.deletedBy = req.user!._id as Types.ObjectId;
    await venue.save();

    logger.info(`🗑️ Venue soft-deleted: ${venue.title} (ID: ${id}) by ${req.user!.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Venue deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/venues
 * Browse published venues (Public browse, search, filters)
 */
export const getVenues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query: any = { isDeleted: false };

    // Default filters for public browse: MUST be APPROVED and PUBLISHED
    // Unless the user is authenticated and has the ADMIN role!
    const isAdmin = req.user && req.user.role === 'admin';
    if (isAdmin) {
      if (req.query.approvalStatus) {
        query.approvalStatus = req.query.approvalStatus;
      }
      if (req.query.publicationStatus) {
        query.publicationStatus = req.query.publicationStatus;
      }
    } else {
      query.approvalStatus = 'APPROVED';
      query.publicationStatus = 'PUBLISHED';
    }

    // 1. Text Search matching title or description
    if (req.query.search) {
      const searchStr = req.query.search as string;
      query.$or = [
        { title: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } },
      ];
    }

    // 2. Exact Filters
    if (req.query.city) {
      query.city = { $regex: `^${req.query.city}$`, $options: 'i' };
    }
    if (req.query.venueType) {
      query.venueType = req.query.venueType;
    }
    if (req.query.capacity) {
      query.capacity = { $gte: parseInt(req.query.capacity as string, 10) };
    }

    // 3. Price Filter (range mapping)
    if (req.query.minPrice || req.query.maxPrice) {
      query['pricing.pricePerDay'] = {};
      if (req.query.minPrice) {
        query['pricing.pricePerDay'].$gte = parseFloat(req.query.minPrice as string);
      }
      if (req.query.maxPrice) {
        query['pricing.pricePerDay'].$lte = parseFloat(req.query.maxPrice as string);
      }
    }

    // 4. Amenities Filter (all matches)
    if (req.query.amenities) {
      const amenitiesArr = Array.isArray(req.query.amenities)
        ? req.query.amenities
        : (req.query.amenities as string).split(',');
      query.amenities = { $all: amenitiesArr };
    }

    // 5. Geospatial location search (within radius)
    if (req.query.lat && req.query.lng) {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radiusKm = parseFloat((req.query.radius as string) || '10'); // default 10km radius
      
      // Earth radius is ~6378.1 km
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusKm * 1000, // in meters
        },
      };
    }

    // Sorting definition
    let sortOptions: any = { createdAt: -1 }; // default: newest first
    if (req.query.sortBy) {
      const sortBy = req.query.sortBy as string;
      if (sortBy === 'priceAsc') sortOptions = { 'pricing.pricePerDay': 1 };
      else if (sortBy === 'priceDesc') sortOptions = { 'pricing.pricePerDay': -1 };
      else if (sortBy === 'capacity') sortOptions = { capacity: -1 };
      else if (sortBy === 'rating') sortOptions = { rating: -1 };
    }

    // Pagination parameters
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '12', 10);
    const skip = (page - 1) * limit;

    const [venues, total] = await Promise.all([
      Venue.find(query).sort(sortOptions).skip(skip).limit(limit),
      Venue.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        venues,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/venues/:slug
 * Fetch a single Venue by its SEO slug (Public / Guarded draft)
 */
export const getVenueBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const query: any = { isDeleted: false };
    if (Types.ObjectId.isValid(slug)) {
      query.$or = [{ _id: slug }, { slug }];
    } else {
      query.slug = slug;
    }

    const venue = await Venue.findOne(query);
    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    // If venue is not approved or not published, restrict access to the Owner or Admins only
    if (
      venue.approvalStatus !== 'APPROVED' ||
      venue.publicationStatus !== 'PUBLISHED'
    ) {
      const isOwner = req.user && venue.ownerId.toString() === req.user._id.toString();
      const isAdmin = req.user && req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        next(new AppError('Access denied. This venue is not publicly accessible yet.', 403));
        return;
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        venue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/owner/venues
 * Get all venues created by logged-in Owner (Owner only)
 */
export const getOwnerVenues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user!._id;
    const query = { ownerId, isDeleted: false };

    // Support pagination
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [venues, total] = await Promise.all([
      Venue.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Venue.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        venues,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/venues/:id/approve
 * Approve venue (Admin only)
 */
export const approveVenue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await Venue.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { approvalStatus: 'APPROVED' },
      { new: true }
    );

    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    logger.info(`✅ Venue APPROVED by Admin: ${venue.title} (ID: ${id})`);

    res.status(200).json({
      status: 'success',
      message: 'Venue approved successfully',
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/venues/:id/reject
 * Reject venue (Admin only)
 */
export const rejectVenue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await Venue.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { approvalStatus: 'REJECTED' },
      { new: true }
    );

    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    logger.info(`❌ Venue REJECTED by Admin: ${venue.title} (ID: ${id})`);

    res.status(200).json({
      status: 'success',
      message: 'Venue rejected successfully',
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/venues/:id/suspend
 * Suspend venue (Admin only)
 */
export const suspendVenue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await Venue.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { approvalStatus: 'SUSPENDED' },
      { new: true }
    );

    if (!venue) {
      next(new AppError('Venue not found', 404));
      return;
    }

    logger.info(`⚠️ Venue SUSPENDED by Admin: ${venue.title} (ID: ${id})`);

    res.status(200).json({
      status: 'success',
      message: 'Venue suspended successfully',
      data: { venue },
    });
  } catch (error) {
    next(error);
  }
};
