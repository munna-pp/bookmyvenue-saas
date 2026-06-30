import { Types } from 'mongoose';
import { Venue } from '../../venues/models/Venue.js';
import { Booking } from '../../bookings/models/Booking.js';
import { SearchHistory } from '../models/SearchHistory.js';
import { logger } from '../../../utils/logger.js';

export interface SearchParams {
  q?: string;
  city?: string;
  state?: string;
  country?: string;
  venueType?: string;
  category?: string;
  capacity?: number;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  amenities?: string[];
  featured?: boolean;
  date?: string;
  sortBy?: string;
  page: number;
  limit: number;
}

/**
 * Execute advanced search matching queries on Venues
 */
export const executeSearch = async (
  params: SearchParams,
  customerId?: string
) => {
  const query: any = {
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
  };

  // 1. Full-text / Keyword Search
  if (params.q) {
    const qReg = new RegExp(params.q, 'i');
    query.$or = [
      { title: qReg },
      { description: qReg },
      { category: qReg },
      { 'address.street': qReg },
      { city: qReg },
    ];
  }

  // 2. Geographic Filters
  if (params.city) {
    query.city = { $regex: params.city, $options: 'i' };
  }
  if (params.state) {
    query.state = { $regex: params.state, $options: 'i' };
  }
  if (params.country) {
    query.country = { $regex: params.country, $options: 'i' };
  }

  // 3. Venue Details Filters
  if (params.venueType) {
    query.venueType = params.venueType;
  }
  if (params.category) {
    query.category = { $regex: params.category, $options: 'i' };
  }
  if (params.capacity) {
    query.capacity = { $gte: params.capacity };
  }

  // 4. Price range Filter
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    query['pricing.pricePerDay'] = {};
    if (params.minPrice !== undefined) {
      query['pricing.pricePerDay'].$gte = params.minPrice;
    }
    if (params.maxPrice !== undefined) {
      query['pricing.pricePerDay'].$lte = params.maxPrice;
    }
  }

  // 5. Rating Filter
  if (params.rating !== undefined) {
    query.rating = { $gte: params.rating };
  }

  // 6. Amenities Filter
  if (params.amenities && params.amenities.length > 0) {
    query.amenities = { $all: params.amenities };
  }

  // 7. Featured Filter (High rating fallback)
  if (params.featured) {
    query.rating = { $gte: 4.0 };
  }

  // 8. Availability check
  if (params.date) {
    const eventDate = new Date(params.date);
    if (!isNaN(eventDate.getTime())) {
      const occupiedBookings = await Booking.find({
        eventDate,
        bookingStatus: { $in: ['CONFIRMED', 'PAID', 'COMPLETED', 'OWNER_APPROVED'] },
      })
        .select('venueId')
        .lean();

      const occupiedVenueIds = occupiedBookings.map((b) => b.venueId);
      if (occupiedVenueIds.length > 0) {
        query._id = { $nin: occupiedVenueIds };
      }
    }
  }

  // 9. Sorting
  let sortOptions: any = { createdAt: -1 };
  if (params.sortBy === 'newest') {
    sortOptions = { createdAt: -1 };
  } else if (params.sortBy === 'price_asc' || params.sortBy === 'price low-high') {
    sortOptions = { 'pricing.pricePerDay': 1 };
  } else if (params.sortBy === 'price_desc' || params.sortBy === 'price high-low') {
    sortOptions = { 'pricing.pricePerDay': -1 };
  } else if (params.sortBy === 'highest_rated') {
    sortOptions = { rating: -1, reviewCount: -1 };
  } else if (params.sortBy === 'most_reviewed') {
    sortOptions = { reviewCount: -1 };
  }

  const skip = (params.page - 1) * params.limit;

  logger.info(`🔍 Search query: ${JSON.stringify(query)} (page: ${params.page}, limit: ${params.limit})`);

  const [venues, total] = await Promise.all([
    Venue.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(params.limit)
      .lean(),
    Venue.countDocuments(query),
  ]);

  // Log search action to analytics asynchronously
  if (params.q || params.city || params.venueType) {
    logSearchQuery(customerId, params.q, {
      city: params.city,
      state: params.state,
      country: params.country,
      venueType: params.venueType,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      capacity: params.capacity,
    }).catch((err) => logger.error('❌ Failed to log search analytics:', err));
  }

  return { venues, total };
};

/**
 * Log search query for analytics tracing
 */
export const logSearchQuery = async (
  customerId?: string,
  keyword?: string,
  filters: Record<string, any> = {}
) => {
  try {
    const custId = customerId ? new Types.ObjectId(customerId) : undefined;
    await SearchHistory.create({
      customerId: custId,
      keyword: keyword || undefined,
      filters,
      searchedAt: new Date(),
    });
  } catch (error) {
    logger.error('❌ Error logging search query to history:', error);
  }
};

/**
 * Find venues nearby using geolocation coordinates and maximum radial distance in kilometers.
 */
export const executeNearbySearch = async (params: {
  lat: number;
  lng: number;
  radius: number; // in km
  page: number;
  limit: number;
}) => {
  const skip = (params.page - 1) * params.limit;
  const maxDistanceInMeters = params.radius * 1000;

  const query: any = {
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [params.lng, params.lat], // [longitude, latitude]
        },
        $maxDistance: maxDistanceInMeters,
      },
    },
  };

  logger.info(`🌐 Geo Search nearby: lat=${params.lat}, lng=${params.lng}, radius=${params.radius}km`);

  const [venues, total] = await Promise.all([
    Venue.find(query)
      .skip(skip)
      .limit(params.limit)
      .lean(),
    // countDocuments fails on queries with $nearSphere geolocation query operators in Mongoose; use count or find.length/separate geometry count
    // So to count documents safely for geospatial radius, we can use $geoWithin or execute find without limit/skip
    Venue.countDocuments({
      isDeleted: false,
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      location: {
        $geoWithin: {
          $centerSphere: [[params.lng, params.lat], params.radius / 6378.1], // radius in radians
        },
      },
    }),
  ]);

  return { venues, total };
};

/**
 * Get instant autocomplete suggestions matching partial query on venue titles, cities, or types.
 */
export const executeSuggestionsAutocomplete = async (q: string) => {
  if (!q || q.trim() === '') {
    return [];
  }

  const queryTerm = q.trim();
  const qReg = new RegExp(queryTerm, 'i');

  const venueTypesList = [
    'wedding_hall',
    'convention_center',
    'banquet_hall',
    'birthday_venue',
    'resort',
    'meeting_room',
    'sports_ground',
    'farm_house',
    'event_space',
  ];

  // 1. Fetch matching venues (limit 5)
  const venues = await Venue.find({
    title: qReg,
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
  })
    .limit(5)
    .select('title')
    .lean();

  // 2. Fetch matching cities using distinct with filter (limit 5)
  // Mongoose distinct doesn't support limit natively, slice after fetching
  const matchedCities = await Venue.distinct('city', {
    city: qReg,
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
  });
  const cities = matchedCities.slice(0, 5);

  // 3. Match venue types enum values list (limit 5)
  const matchedTypes = venueTypesList
    .filter((t) => t.replace(/_/g, ' ').toLowerCase().includes(queryTerm.toLowerCase()))
    .slice(0, 5);

  const suggestions: Array<{ text: string; type: 'venue' | 'city' | 'type' }> = [];

  // Populate formatted suggestions
  venues.forEach((v) => {
    suggestions.push({ text: v.title, type: 'venue' });
  });

  cities.forEach((c) => {
    suggestions.push({ text: c, type: 'city' });
  });

  matchedTypes.forEach((t) => {
    suggestions.push({ text: t.replace(/_/g, ' '), type: 'type' });
  });

  return suggestions;
};
