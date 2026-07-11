// E2E Booking Engine Integration Tests
const baseUrl = 'http://127.0.0.1:5000';

async function runTests() {
  console.log('🧪 Starting E2E Booking Engine Integration Tests...\n');

  let adminToken = '';
  let ownerToken = '';
  let customerToken = '';
  let venueId = '';
  let bookingId = '';
  let bookingNumber = '';

  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 25); // 25 days in future
  const testDateStr = testDate.toISOString().slice(0, 10);

  // 1. LOGIN ADMIN
  console.log('1. Logging in as seeded Admin...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@bookmyvenue.com',
        password: 'adminpassword',
      }),
    });
    const json = await res.json();
    if (res.status !== 200) throw new Error('Admin login failed');
    adminToken = json.data.accessToken;
    console.log('✅ Admin login succeeded.');
  } catch (err) {
    console.error('❌ Admin login failed:', err.message);
    process.exit(1);
  }

  // 2. LOGIN OWNER
  console.log('\n2. Logging in as seeded Owner...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@bookmyvenue.com',
        password: 'ownerpassword',
      }),
    });
    const json = await res.json();
    if (res.status !== 200) throw new Error('Owner login failed');
    ownerToken = json.data.accessToken;
    console.log('✅ Owner login succeeded.');
  } catch (err) {
    console.error('❌ Owner login failed:', err.message);
    process.exit(1);
  }

  // 3. LOGIN CUSTOMER
  console.log('\n3. Logging in as seeded Customer...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@bookmyvenue.com',
        password: 'customerpassword',
      }),
    });
    const json = await res.json();
    if (res.status !== 200) throw new Error('Customer login failed');
    customerToken = json.data.accessToken;
    console.log('✅ Customer login succeeded.');
  } catch (err) {
    console.error('❌ Customer login failed:', err.message);
    process.exit(1);
  }

  // 4. RETRIEVE APPROVED VENUE
  console.log('\n4. Fetching approved venues to select target...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues`);
    const json = await res.json();
    if (res.status !== 200 || !json.data.venues || json.data.venues.length === 0) {
      throw new Error('No approved venues available in database');
    }
    venueId = json.data.venues[0]._id;
    console.log(`✅ Target Venue ID selected: ${venueId}`);
  } catch (err) {
    console.error('❌ Venue retrieval failed:', err.message);
    process.exit(1);
  }

  // 5. TEST OWNERSHIP GUARD (OWNER TRYING TO BOOK THEIR OWN VENUE)
  console.log('\n5. Testing ownership guard (Owner booking own venue)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        venueId,
        eventType: 'corporate',
        eventDate: testDateStr,
        startTime: '10:00',
        endTime: '18:00',
        guestCount: 20,
      }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status !== 400 && res.status !== 403) {
      throw new Error('Ownership guard failed, owner allowed to reserve their own venue!');
    }
    console.log('✅ Ownership guard block passed successfully.');
  } catch (err) {
    console.error('❌ Ownership guard check failed:', err.message);
    process.exit(1);
  }

  // 6. CREATE SUCCESSFUL RESERVATION
  console.log('\n6. Creating valid booking request (as Customer)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        venueId,
        eventType: 'wedding',
        eventDate: testDateStr,
        startTime: '12:00',
        endTime: '16:00',
        guestCount: 150,
        specialRequests: 'Need floral decorations at entry way.',
      }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status !== 201) throw new Error(`Creation failed: ${JSON.stringify(json)}`);
    bookingId = json.data.booking._id;
    bookingNumber = json.data.booking.bookingNumber;
    console.log(`✅ Booking created successfully.`);
    console.log(`Booking Number: ${bookingNumber} | ID: ${bookingId}`);
    console.log(`Initial Status: ${json.data.booking.bookingStatus} (Expected: PENDING)`);
    if (json.data.booking.bookingStatus !== 'PENDING') throw new Error('Status not PENDING');
  } catch (err) {
    console.error('❌ Booking creation failed:', err.message);
    process.exit(1);
  }

  // 7. PREVENT DUPLICATE OVERLAPPING BOOKING
  console.log('\n7. Attempting to create an overlapping booking...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        venueId,
        eventType: 'reception',
        eventDate: testDateStr,
        startTime: '14:00', // Overlaps with 12:00-16:00
        endTime: '18:00',
        guestCount: 100,
      }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status !== 409) {
      throw new Error('Overlapping double booking was incorrectly allowed!');
    }
    console.log('✅ Overlap check correctly blocked double bookings (Status 409).');
  } catch (err) {
    console.error('❌ Overlap guard check failed:', err.message);
    process.exit(1);
  }

  // 8. FETCH VENUE AVAILABILITY CALENDAR
  console.log('\n8. Querying venue availability calendar...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues/${venueId}/calendar`);
    const json = await res.json();
    if (res.status !== 200) throw new Error('Calendar retrieval failed');

    const booked = json.data.booked.find((b) => b.bookingNumber === bookingNumber);
    console.log(`Found booking in calendar slots: ${booked ? 'YES' : 'NO'} (Expected: YES)`);
    if (!booked) throw new Error('Seeded booking not found in calendar schedule');
    console.log(
      `Booking details matched: Date: ${booked.date} | Times: ${booked.startTime}-${booked.endTime}`
    );
    console.log('✅ Venue calendar correctly reflects busy slots.');
  } catch (err) {
    console.error('❌ Calendar validation failed:', err.message);
    process.exit(1);
  }

  // 9. OWNER RETRIEVES ACTIVE REQUESTS
  console.log('\n9. Fetching bookings requests queue (as Host/Owner)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/owner/bookings`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const json = await res.json();
    const found = json.data.bookings.find((b) => b.bookingNumber === bookingNumber);
    console.log(`Found booking in Host queue: ${found ? 'YES' : 'NO'} (Expected: YES)`);
    if (!found) throw new Error('Booking not present in Owner request list');
    console.log('✅ Owner retrieval queue works.');
  } catch (err) {
    console.error('❌ Owner list retrieval failed:', err.message);
    process.exit(1);
  }

  // 10. APPROVE BOOKING AS OWNER
  console.log('\n10. Approving booking (as Owner)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings/${bookingId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status !== 200) throw new Error('Approval request failed');
    console.log(`Approved status: ${json.data.booking.bookingStatus} (Expected: OWNER_APPROVED)`);
    if (json.data.booking.bookingStatus !== 'OWNER_APPROVED')
      throw new Error('Invalid status update');
    console.log('✅ Owner approval succeeded.');
  } catch (err) {
    console.error('❌ Booking approval failed:', err.message);
    process.exit(1);
  }

  // 11. CANCEL APPROVED BOOKING AS CUSTOMER
  console.log('\n11. Cancelling approved booking (as Customer)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellationReason: 'Change in event plans' }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status !== 200) throw new Error('Cancellation request failed');
    console.log(`Cancelled status: ${json.data.booking.bookingStatus} (Expected: CANCELLED)`);
    console.log(`Cancelled By User matches: ${json.data.booking.cancelledBy ? 'YES' : 'NO'}`);
    if (json.data.booking.bookingStatus !== 'CANCELLED') throw new Error('Invalid status update');
    console.log('✅ Customer cancellation succeeded.');
  } catch (err) {
    console.error('❌ Booking cancellation failed:', err.message);
    process.exit(1);
  }

  // 12. ADMIN AUDITS ALL BOOKINGS & TEST DISPUTE STATE OVERRIDE
  console.log('\n12. Performing Admin override on cancelled booking status...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/admin/bookings/${bookingId}/override`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingStatus: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        notes: 'Dispute arbitration override to REFUNDED state.',
      }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.status !== 200) throw new Error('Admin override failed');
    console.log(`Overridden status: ${json.data.booking.bookingStatus} (Expected: REFUNDED)`);
    console.log(
      `Overridden payment status: ${json.data.booking.paymentStatus} (Expected: REFUNDED)`
    );
    if (
      json.data.booking.bookingStatus !== 'REFUNDED' ||
      json.data.booking.paymentStatus !== 'REFUNDED'
    ) {
      throw new Error('Admin override failed to apply status variables.');
    }
    console.log('✅ Admin dispute override succeeded.');
  } catch (err) {
    console.error('❌ Admin override failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 E2E Booking Engine Integration Tests passed successfully!');
}

runTests();
