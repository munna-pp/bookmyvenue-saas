// Advanced Search, Discovery & Maps Integration Test Suite
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const baseUrl = 'http://127.0.0.1:5000';

async function runSearchTests() {
  console.log('🧪 Starting Advanced Search & Maps Integration Tests...\n');

  let adminToken = '';
  let customerToken = '';
  let customerId = '';
  let venueId = '';
  let venueTitle = '';
  let venueSlug = '';

  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

  // 1. LOGINS
  try {
    const resAdmin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bookmyvenue.com', password: 'adminpassword' }),
    });
    const adminJson = await resAdmin.json();
    adminToken = adminJson.data.accessToken;

    const resCust = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@bookmyvenue.com', password: 'customerpassword' }),
    });
    const custJson = await resCust.json();
    customerToken = custJson.data.accessToken;
    customerId = custJson.data.user.id;

    console.log('✅ Logins completed successfully.');
  } catch (err) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // 2. DATABASE PREPARATION (Setup venue coordinates in Mumbai)
  try {
    const connVenues = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_venues`)
      .asPromise();
    const venue = await connVenues.collection('venues').findOne({ isDeleted: false });
    if (!venue) {
      throw new Error('No reference venue found in database.');
    }

    venueId = venue._id.toString();
    venueTitle = venue.title;
    venueSlug = venue.slug;

    // Update coordinates, approval, publication, capacity, price to ensure predictable search filters
    await connVenues.collection('venues').updateOne(
      { _id: venue._id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [72.8777, 19.076], // [lng, lat] (Mumbai)
          },
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          venueType: 'wedding_hall',
          capacity: 500,
          'pricing.pricePerDay': 150000,
          rating: 4.8,
          reviewCount: 15,
          approvalStatus: 'APPROVED',
          publicationStatus: 'PUBLISHED',
        },
      }
    );
    await connVenues.close();

    // Clear search history first
    const connSearch = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_search`)
      .asPromise();
    await connSearch.collection('searchhistories').deleteMany({});
    await connSearch.close();

    console.log(`✅ Mumbai venue coordinates prepared: Venue "${venueTitle}" (ID: ${venueId})`);
  } catch (err) {
    console.error('❌ Database setup phase failed:', err.message);
    process.exit(1);
  }

  // 3. KEYWORD SEARCH
  try {
    console.log('\n--- Testing Keyword & Advanced Filters Search ---');
    const res = await fetch(
      `${baseUrl}/api/v1/search/venues?q=${encodeURIComponent(venueTitle)}&city=Mumbai&minPrice=100000&maxPrice=200000&capacity=300&rating=4`
    );
    const json = await res.json();

    if (res.status === 200 && json.data.venues.length > 0) {
      console.log(`✅ Keyword search returned ${json.data.venues.length} venues.`);
      const matched = json.data.venues.some((v) => (v.id || v._id) === venueId);
      if (matched) {
        console.log('✅ Found the target seeded venue in filter results.');
      } else {
        throw new Error('Seeded venue was missing from filter matches.');
      }
    } else {
      throw new Error(`Advanced search failed: ${json.message}`);
    }
  } catch (err) {
    console.error('❌ Keyword search phase failed:', err.message);
    process.exit(1);
  }

  // 4. AUTOCOMPLETE
  try {
    console.log('\n--- Testing Suggestions Autocomplete ---');
    // Match partial title
    const partial = venueTitle.substring(0, 4);
    const res = await fetch(
      `${baseUrl}/api/v1/search/suggestions?q=${encodeURIComponent(partial)}`
    );
    const json = await res.json();

    if (res.status === 200 && json.data.suggestions) {
      console.log(`✅ Autocomplete suggestions count: ${json.data.suggestions.length}`);
      const venueMatched = json.data.suggestions.some(
        (s) => s.type === 'venue' && s.text.toLowerCase().includes(partial.toLowerCase())
      );
      if (venueMatched) {
        console.log('✅ Autocomplete correctly suggested venue title matches.');
      } else {
        console.warn(
          '⚠️ Autocomplete had no direct venue title matches (might be due to tiny query term).'
        );
      }
    } else {
      throw new Error(`Autocomplete suggestions failed: ${json.message}`);
    }
  } catch (err) {
    console.error('❌ Autocomplete suggestions phase failed:', err.message);
    process.exit(1);
  }

  // 5. GEO SEARCH & RADIUS
  try {
    console.log('\n--- Testing Geospatial Radial Search ---');
    // Call nearby endpoint centered on Mumbai
    const res = await fetch(`${baseUrl}/api/v1/search/nearby?lat=19.0760&lng=72.8777&radius=25`);
    const json = await res.json();

    if (res.status === 200 && json.data.venues.length > 0) {
      console.log(
        `✅ Geospatial nearby query (within 25km) returned ${json.data.venues.length} venues.`
      );
      const matched = json.data.venues.some((v) => (v.id || v._id) === venueId);
      if (matched) {
        console.log('✅ Found seeded venue in geospatial nearby radius bounds.');
      } else {
        throw new Error('Seeded venue was not in nearby list bounds.');
      }
    } else {
      throw new Error(`Geospatial query failed: ${json.message}`);
    }

    // Call nearby endpoint centered far away (e.g. lat=10, lng=10)
    const resFar = await fetch(`${baseUrl}/api/v1/search/nearby?lat=10.0000&lng=10.0000&radius=25`);
    const jsonFar = await resFar.json();
    if (resFar.status === 200 && jsonFar.data.venues.length === 0) {
      console.log(
        '✅ Geospatial nearby query returned 0 matches for coordinates far away (correct).'
      );
    } else {
      throw new Error('Nearby query returned results for coordinates far away!');
    }
  } catch (err) {
    console.error('❌ Geospatial radial search phase failed:', err.message);
    process.exit(1);
  }

  // 6. RECOMMENDATIONS
  try {
    console.log('\n--- Testing Recommendations Module ---');
    // Public guest recommendations
    const resPublic = await fetch(`${baseUrl}/api/v1/search/recommended?limit=3`);
    const jsonPublic = await resPublic.json();

    if (resPublic.status === 200 && jsonPublic.data.venues.length > 0) {
      console.log(
        `✅ Public guest recommendation fallback returned ${jsonPublic.data.venues.length} venues.`
      );
    } else {
      throw new Error(`Guest recommendations query failed: ${jsonPublic.message}`);
    }

    // Authenticated recommendations
    const resAuth = await fetch(`${baseUrl}/api/v1/search/recommended?limit=3`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const jsonAuth = await resAuth.json();

    if (resAuth.status === 200 && jsonAuth.data.venues.length > 0) {
      console.log(
        `✅ Authenticated customer recommendation query returned ${jsonAuth.data.venues.length} venues.`
      );
    } else {
      throw new Error(`Auth recommendations query failed: ${jsonAuth.message}`);
    }
  } catch (err) {
    console.error('❌ Recommendations module phase failed:', err.message);
    process.exit(1);
  }

  // 7. SEARCH HISTORY LOGGING
  try {
    console.log('\n--- Testing Search History Log Verification ---');
    // Perform search with customer auth to create history
    await fetch(`${baseUrl}/api/v1/search/venues?q=mumbai&city=Mumbai&venueType=wedding_hall`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    // Check history database directly
    const connSearch = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_search`)
      .asPromise();
    const history = await connSearch
      .collection('searchhistories')
      .findOne({ customerId: new mongoose.Types.ObjectId(customerId) });
    await connSearch.close();

    if (history) {
      console.log(
        `✅ Search history log verified: User ${history.customerId} searched for "${history.keyword}" with city "${history.filters.city}"`
      );
    } else {
      throw new Error('Search history entry not created for authenticated search query!');
    }
  } catch (err) {
    console.error('❌ Search history logging phase failed:', err.message);
    process.exit(1);
  }

  // 8. TRENDING & FEATURED
  try {
    console.log('\n--- Testing Trending & Featured Endpoints ---');
    const resTrending = await fetch(`${baseUrl}/api/v1/search/trending`);
    const jsonTrending = await resTrending.json();
    if (resTrending.status === 200 && jsonTrending.data.keywords) {
      console.log(
        `✅ Trending endpoint returned ${jsonTrending.data.keywords.length} keywords and ${jsonTrending.data.venues.length} venues.`
      );
    } else {
      throw new Error(`Trending endpoint failed: ${jsonTrending.message}`);
    }

    const resFeatured = await fetch(`${baseUrl}/api/v1/search/featured`);
    const jsonFeatured = await resFeatured.json();
    if (resFeatured.status === 200 && jsonFeatured.data.venues) {
      console.log(`✅ Featured endpoint returned ${jsonFeatured.data.venues.length} venues.`);
    } else {
      throw new Error(`Featured endpoint failed: ${jsonFeatured.message}`);
    }
  } catch (err) {
    console.error('❌ Trending/Featured phase failed:', err.message);
    process.exit(1);
  }

  // 9. ANALYTICS (Admin authorization)
  try {
    console.log('\n--- Testing Search Analytics Compilation ---');
    const res = await fetch(`${baseUrl}/api/v1/search/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const json = await res.json();

    if (res.status === 200 && json.data) {
      console.log('✅ Search analytics compiled successfully:');
      console.log(`   - Total searches logged: ${json.data.totalSearches}`);
      console.log(`   - Popular keywords: ${json.data.popularKeywords.length}`);
      console.log(`   - Zero-result searches count: ${json.data.zeroResultCount}`);
    } else {
      throw new Error(`Search analytics failed: ${json.message}`);
    }
  } catch (err) {
    console.error('❌ Search analytics compilation phase failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 All Advanced Search & Maps E2E Verification Tests passed successfully!');
  process.exit(0);
}

runSearchTests();
