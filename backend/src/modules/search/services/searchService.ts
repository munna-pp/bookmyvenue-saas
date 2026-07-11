import { Types, SortOrder } from 'mongoose';
import { Venue } from '../../venues/models/Venue.js';
import { Booking } from '../../bookings/models/Booking.js';
import { SearchHistory } from '../models/SearchHistory.js';
import { Wishlist } from '../../reviews/models/Wishlist.js';
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
export const executeSearch = async (params: SearchParams, customerId?: string) => {
  const query: Record<string, unknown> = {
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
    const priceQuery: Record<string, number> = {};
    if (params.minPrice !== undefined) {
      priceQuery.$gte = params.minPrice;
    }
    if (params.maxPrice !== undefined) {
      priceQuery.$lte = params.maxPrice;
    }
    query['pricing.pricePerDay'] = priceQuery;
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
  let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 };
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

  logger.info(
    `🔍 Search query: ${JSON.stringify(query)} (page: ${params.page}, limit: ${params.limit})`
  );

  const [venues, total] = await Promise.all([
    Venue.find(query).sort(sortOptions).skip(skip).limit(params.limit).lean(),
    Venue.countDocuments(query),
  ]);

  // Log search action to analytics asynchronously
  if (params.q || params.city || params.venueType) {
    logSearchQuery(
      customerId,
      params.q,
      {
        city: params.city,
        state: params.state,
        country: params.country,
        venueType: params.venueType,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        capacity: params.capacity,
      },
      total
    ).catch((err) => logger.error('❌ Failed to log search analytics:', err));
  }

  return { venues, total };
};

/**
 * Log search query for analytics tracing
 */
export const logSearchQuery = async (
  customerId?: string,
  keyword?: string,
  filters: Record<string, unknown> = {},
  resultsCount: number = 0
) => {
  try {
    const custId = customerId ? new Types.ObjectId(customerId) : undefined;
    await SearchHistory.create({
      customerId: custId,
      keyword: keyword || undefined,
      filters,
      resultsCount,
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

  const query: Record<string, unknown> = {
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

  logger.info(
    `🌐 Geo Search nearby: lat=${params.lat}, lng=${params.lng}, radius=${params.radius}km`
  );

  const [venues, total] = await Promise.all([
    Venue.find(query).skip(skip).limit(params.limit).lean(),
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

/**
 * Generate personalized recommendations using customer search history, wishlist, previous bookings,
 * or fallback to highest rated / featured venues for guests or new users.
 */
export const executeRecommendations = async (customerId?: string, limit: number = 6) => {
  const fallbackQuery = {
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
  };

  const getFallbackVenues = () => {
    return Venue.find(fallbackQuery).sort({ rating: -1, reviewCount: -1 }).limit(limit).lean();
  };

  if (!customerId) {
    logger.info('💡 Guest recommendations request: falling back to highest rated venues');
    return getFallbackVenues();
  }

  try {
    const custId = new Types.ObjectId(customerId);

    // 1. Gather Search History keywords/cities/venueTypes
    const searchHistory = await SearchHistory.find({ customerId: custId })
      .sort({ searchedAt: -1 })
      .limit(10)
      .lean();

    // 2. Gather Wishlist items
    const wishlistItems = await Wishlist.find({ customerId: custId }).lean();
    const wishlistedVenueIds = wishlistItems.map((item) => item.venueId);

    // 3. Gather Bookings
    const bookings = await Booking.find({
      customerId: custId,
      bookingStatus: { $ne: 'CANCELLED' },
    })
      .limit(10)
      .lean();
    const bookedVenueIds = bookings.map((b) => b.venueId);

    // 4. Combine venue IDs to exclude
    const excludeVenueIds = Array.from(
      new Set([
        ...wishlistedVenueIds.map((id) => id.toString()),
        ...bookedVenueIds.map((id) => id.toString()),
      ])
    ).map((id) => new Types.ObjectId(id));

    // 5. Query details of user booked & wishlisted venues to extract categories
    const interactiveVenueIds = [...wishlistedVenueIds, ...bookedVenueIds];
    let preferredVenueTypes: string[] = [];
    let preferredCities: string[] = [];

    if (interactiveVenueIds.length > 0) {
      const interactiveVenues = await Venue.find({
        _id: { $in: interactiveVenueIds },
      })
        .select('venueType city')
        .lean();

      preferredVenueTypes = interactiveVenues.map((v) => v.venueType);
      preferredCities = interactiveVenues.map((v) => v.city);
    }

    // Include categories from search history filters
    searchHistory.forEach((hist) => {
      if (hist.filters) {
        if (typeof hist.filters.venueType === 'string') preferredVenueTypes.push(hist.filters.venueType);
        if (typeof hist.filters.city === 'string') preferredCities.push(hist.filters.city);
      }
    });

    preferredVenueTypes = Array.from(new Set(preferredVenueTypes));
    preferredCities = Array.from(new Set(preferredCities));

    // 6. Build recommended matching query
    const matchQuery: Record<string, unknown> = {
      isDeleted: false,
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      _id: { $nin: excludeVenueIds }, // exclude already wishlisted or booked
    };

    const criteria: Record<string, unknown>[] = [];
    if (preferredVenueTypes.length > 0) {
      criteria.push({ venueType: { $in: preferredVenueTypes } });
    }
    if (preferredCities.length > 0) {
      criteria.push({ city: { $in: preferredCities.map((c) => new RegExp(c, 'i')) } });
    }

    if (criteria.length > 0) {
      matchQuery.$or = criteria;
    } else {
      // No personalized attributes found: return highest rated fallback
      return getFallbackVenues();
    }

    logger.info(
      `💡 Generating recommended query for user ${customerId}: ${JSON.stringify(matchQuery)}`
    );

    let recommended = await Venue.find(matchQuery)
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .lean();

    // If matches are less than the limit, fill the remaining slots with fallback venues
    if (recommended.length < limit) {
      const remainingCount = limit - recommended.length;
      const recommendedIds = recommended.map((r) => r._id.toString());
      const allExclude = Array.from(
        new Set([...excludeVenueIds.map((id) => id.toString()), ...recommendedIds])
      ).map((id) => new Types.ObjectId(id));

      const fillVenues = await Venue.find({
        isDeleted: false,
        approvalStatus: 'APPROVED',
        publicationStatus: 'PUBLISHED',
        _id: { $nin: allExclude },
      })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(remainingCount)
        .lean();

      recommended = [...recommended, ...fillVenues];
    }

    return recommended;
  } catch (error) {
    logger.error('❌ Error generating recommended list:', error);
    return getFallbackVenues();
  }
};

/**
 * Compile search analytics statistics
 */
export const executeGetSearchAnalytics = async () => {
  const [totalSearches, zeroResultCount, popularKeywords, popularCities, popularVenueTypes] =
    await Promise.all([
      // 1. Total searches
      SearchHistory.countDocuments(),
      // 2. Zero-result count
      SearchHistory.countDocuments({ resultsCount: 0 }),
      // 3. Top keywords (excluding null/undefined)
      SearchHistory.aggregate([
        { $match: { keyword: { $ne: null } } },
        { $group: { _id: '$keyword', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // 4. Top cities
      SearchHistory.aggregate([
        { $match: { 'filters.city': { $nin: [null, ''] } } },
        { $group: { _id: '$filters.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // 5. Top venue types
      SearchHistory.aggregate([
        { $match: { 'filters.venueType': { $ne: null } } },
        { $group: { _id: '$filters.venueType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

  return {
    totalSearches,
    zeroResultCount,
    popularKeywords: popularKeywords.map((item) => ({ keyword: item._id, count: item.count })),
    popularCities: popularCities.map((item) => ({ city: item._id, count: item.count })),
    popularVenueTypes: popularVenueTypes.map((item) => ({
      venueType: item._id,
      count: item.count,
    })),
  };
};

/**
 * Get trending searches and trending venues
 */
export const executeGetTrending = async () => {
  // Top keywords
  const topKeywords = await SearchHistory.aggregate([
    { $match: { keyword: { $ne: null } } },
    { $group: { _id: '$keyword', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Top venues
  const trendingVenues = await Venue.find({
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
  })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(6)
    .lean();

  return {
    keywords: topKeywords.map((k) => k._id),
    venues: trendingVenues,
  };
};

/**
 * Get featured venues (high rating)
 */
export const executeGetFeatured = async () => {
  return Venue.find({
    isDeleted: false,
    approvalStatus: 'APPROVED',
    publicationStatus: 'PUBLISHED',
    rating: { $gte: 4.5 },
  })
    .sort({ reviewCount: -1 })
    .limit(6)
    .lean();
};
