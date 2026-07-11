// Reviews, Ratings & Wishlist Integration Test Suite
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const baseUrl = 'http://127.0.0.1:5000';

async function runReviewTests() {
  console.log('🧪 Starting Reviews, Ratings & Wishlist Integration Tests...\n');

  let adminToken = '';
  let ownerToken = '';
  let customerToken = '';
  let customerId = '';
  let bookingId = '';
  let venueId = '';
  let reviewId = '';

  // 1. LOGINS
  try {
    const resAdmin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bookmyvenue.com', password: 'adminpassword' }),
    });
    const adminJson = await resAdmin.json();
    adminToken = adminJson.data.accessToken;

    const resOwner = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@bookmyvenue.com', password: 'ownerpassword' }),
    });
    const ownerJson = await resOwner.json();
    ownerToken = ownerJson.data.accessToken;

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

  // 2. SETUP COMPLETED BOOKING FOR CUSTOMER
  try {
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

    // Clear existing reviews first
    const connReviews = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_reviews`)
      .asPromise();
    await connReviews.collection('reviews').deleteMany({});
    await connReviews.close();

    // Clear existing wishlist entries
    const connWishlist = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_wishlist`)
      .asPromise();
    await connWishlist.collection('wishlists').deleteMany({});
    await connWishlist.close();

    // Force a booking to completed state
    const connBook = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_bookings`)
      .asPromise();
    const booking = await connBook
      .collection('bookings')
      .findOne({ customerId: new mongoose.Types.ObjectId(customerId) });
    if (!booking) throw new Error('No reference booking found in database.');

    bookingId = booking._id.toString();
    venueId = booking.venueId.toString();

    await connBook
      .collection('bookings')
      .updateOne({ _id: booking._id }, { $set: { bookingStatus: 'COMPLETED' } });
    await connBook.close();

    // Reset venue rating to start fresh
    const connVenues = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_venues`)
      .asPromise();
    await connVenues
      .collection('venues')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(venueId) },
        { $set: { rating: 0, reviewCount: 0 } }
      );
    await connVenues.close();

    console.log(
      `✅ Customer completed booking prepared: Booking ID #${bookingId} for Venue ID #${venueId}`
    );
  } catch (err) {
    console.error('❌ Database setup phase failed:', err.message);
    process.exit(1);
  }

  // 3. SUBMIT REVIEW
  try {
    console.log('\n--- Testing Review Submission ---');
    const res = await fetch(`${baseUrl}/api/v1/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bookingId,
        rating: 5,
        title: 'Outstanding event space!',
        review:
          'The facilities were spotless, staff was exceptionally helpful, and coordinates were correct.',
        images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
      }),
    });

    const json = await res.json();
    if (res.status === 201) {
      reviewId = json.data.review._id;
      console.log(`✅ Review submitted successfully! Review ID: ${reviewId}`);
    } else {
      throw new Error(`Review submission failed: ${json.message}`);
    }

    // 4. PREVENT DUPLICATE REVIEWS
    const resDup = await fetch(`${baseUrl}/api/v1/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bookingId,
        rating: 4,
        title: 'Another review attempt',
        review: 'Should be blocked because a review already exists for this booking.',
      }),
    });

    if (resDup.status === 400) {
      console.log('✅ Duplicate review correctly BLOCKED.');
    } else {
      throw new Error('Duplicate review was not blocked!');
    }
  } catch (err) {
    console.error('❌ Review validation phase failed:', err.message);
    process.exit(1);
  }

  // 5. OWNER REPLY
  try {
    console.log('\n--- Testing Owner Reply ---');
    const res = await fetch(`${baseUrl}/api/v1/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        reply: 'Thank you for your fantastic feedback! We are thrilled that you enjoyed the event.',
      }),
    });

    const json = await res.json();
    if (res.status === 200) {
      console.log('✅ Owner reply submitted and registered successfully.');
    } else {
      throw new Error(`Owner reply failed: ${json.message}`);
    }
  } catch (err) {
    console.error('❌ Owner reply phase failed:', err.message);
    process.exit(1);
  }

  // 6. RATING RECALCULATION
  try {
    console.log('\n--- Testing Venue Ratings Recalculation ---');
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const connVenues = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_venues`)
      .asPromise();
    const venue = await connVenues
      .collection('venues')
      .findOne({ _id: new mongoose.Types.ObjectId(venueId) });
    await connVenues.close();

    console.log(`Venue stats: Rating=${venue.rating}, ReviewCount=${venue.reviewCount}`);
    if (venue.rating === 5 && venue.reviewCount === 1) {
      console.log('✅ Rating and reviewCount recalculated correctly in Venue collection.');
    } else {
      throw new Error('Rating recalculation values mismatch!');
    }
  } catch (err) {
    console.error('❌ Recalculation phase failed:', err.message);
    process.exit(1);
  }

  // 7. WISHLIST ADD, LIST, AND REMOVE
  try {
    console.log('\n--- Testing Wishlist Module ---');

    // Add to wishlist
    const resAdd = await fetch(`${baseUrl}/api/v1/wishlist/${venueId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (resAdd.status === 201) {
      console.log('✅ Venue added to customer wishlist successfully.');
    } else {
      throw new Error('Failed to add to wishlist');
    }

    // Try adding duplicate to wishlist
    const resAddDup = await fetch(`${baseUrl}/api/v1/wishlist/${venueId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (resAddDup.status === 201) {
      console.log('✅ Duplicate wishlist entry prevented (ignored/handled by upsert).');
    } else {
      throw new Error('Duplicate wishlist operation threw error');
    }

    // List and sort wishlist
    const resList = await fetch(`${baseUrl}/api/v1/wishlist?sortBy=newest`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const listJson = await resList.json();
    if (resList.status === 200 && listJson.data.wishlist.length === 1) {
      console.log(
        `✅ Wishlist list fetched successfully containing ${listJson.data.wishlist.length} item.`
      );
      console.log(`✅ Verified saved date is present: ${listJson.data.wishlist[0].createdAt}`);
    } else {
      throw new Error('Wishlist list verification failed');
    }

    // Delete from wishlist
    const resDel = await fetch(`${baseUrl}/api/v1/wishlist/${venueId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (resDel.status === 200) {
      console.log('✅ Venue removed from customer wishlist successfully.');
    } else {
      throw new Error('Failed to remove from wishlist');
    }
  } catch (err) {
    console.error('❌ Wishlist phase failed:', err.message);
    process.exit(1);
  }

  // 8. ADMIN MODERATION
  try {
    console.log('\n--- Testing Admin Review Moderation ---');

    // Admin hides review
    const resHide = await fetch(`${baseUrl}/api/v1/reviews/${reviewId}/hide`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (resHide.status === 200) {
      console.log('✅ Admin successfully hid the review.');
    } else {
      throw new Error('Admin hide operation failed');
    }

    // Verify rating recalculation (should be 0 since the review is hidden)
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const connVenues = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_venues`)
      .asPromise();
    let venue = await connVenues
      .collection('venues')
      .findOne({ _id: new mongoose.Types.ObjectId(venueId) });
    if (venue.rating === 0 && venue.reviewCount === 0) {
      console.log('✅ Rating updated correctly after review hidden (rating reset to 0).');
    } else {
      throw new Error('Hidden review rating recalculation mismatch!');
    }

    // Admin restores review
    const resRestore = await fetch(`${baseUrl}/api/v1/reviews/${reviewId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (resRestore.status === 200) {
      console.log('✅ Admin successfully restored the review.');
    } else {
      throw new Error('Admin restore operation failed');
    }

    // Verify rating recalculation (should be 5 again since review is restored)
    venue = await connVenues
      .collection('venues')
      .findOne({ _id: new mongoose.Types.ObjectId(venueId) });
    if (venue.rating === 5 && venue.reviewCount === 1) {
      console.log('✅ Rating updated correctly after review restored (rating is 5).');
    } else {
      throw new Error('Restored review rating recalculation mismatch!');
    }
    await connVenues.close();

    // Admin permanently purges review
    const resPurge = await fetch(`${baseUrl}/api/v1/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (resPurge.status === 200) {
      console.log('✅ Admin permanently purged the review from database.');
    } else {
      throw new Error('Admin purge operation failed');
    }

    // Final rating recalculation verify (should be 0 since review is gone)
    const connVenuesFinal = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_venues`)
      .asPromise();
    venue = await connVenuesFinal
      .collection('venues')
      .findOne({ _id: new mongoose.Types.ObjectId(venueId) });
    await connVenuesFinal.close();
    if (venue.rating === 0 && venue.reviewCount === 0) {
      console.log('✅ Rating verified after purge (reset to 0).');
    } else {
      throw new Error('Purged review rating recalculation mismatch!');
    }
  } catch (err) {
    console.error('❌ Admin moderation phase failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 All Reviews, Ratings & Wishlist Integration Tests passed successfully!');
  process.exit(0);
}

runReviewTests();
