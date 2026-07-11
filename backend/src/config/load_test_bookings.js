// Booking Concurrency Race Condition Load Test
const baseUrl = 'http://127.0.0.1:5000';

async function runLoadTest() {
  console.log('🧪 Starting Booking Concurrency Race Condition Load Test...\n');

  let customerToken = '';
  let venueId = '';

  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 28); // 28 days in future
  const testDateStr = testDate.toISOString().slice(0, 10);

  // 1. LOGIN CUSTOMER
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

  // 2. RETRIEVE APPROVED VENUE
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues`);
    const json = await res.json();
    if (res.status !== 200 || !json.data.venues || json.data.venues.length === 0) {
      throw new Error('No approved venues available in database');
    }
    venueId = json.data.venues[0]._id;
    console.log(`✅ Selected Venue ID: ${venueId}`);
  } catch (err) {
    console.error('❌ Venue retrieval failed:', err.message);
    process.exit(1);
  }

  // 3. FIRE CONCURRENT REQUESTS
  console.log(
    `\nFiring 5 concurrent booking requests for date: ${testDateStr} timeslot: 10:00-14:00...`
  );

  const requestPayload = {
    venueId,
    eventType: 'corporate',
    eventDate: testDateStr,
    startTime: '10:00',
    endTime: '14:00',
    guestCount: 50,
  };

  const requests = Array.from({ length: 5 }).map(() =>
    fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    })
  );

  try {
    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);
    console.log('Returned Status Codes:', statuses);

    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    console.log(`\nSummary:`);
    console.log(`- Success (201 Created): ${successCount}`);
    console.log(`- Conflict (409 Conflict): ${conflictCount}`);

    // Assertions
    if (successCount !== 1) {
      throw new Error(
        `Load Test FAILED: Expected exactly 1 successful booking creation, but got ${successCount}!`
      );
    }

    if (conflictCount !== 4) {
      throw new Error(
        `Load Test FAILED: Expected exactly 4 lock/overlap collisions, but got ${conflictCount}!`
      );
    }

    console.log(
      '\n🎉 Race condition load test passed successfully! Redis locking works flawlessly.'
    );
  } catch (err) {
    console.error('\n❌ Load Test failed:', err.message);
    process.exit(1);
  }
}

runLoadTest();
