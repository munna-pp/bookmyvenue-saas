// E2E Venue Management Integration Tests
const baseUrl = 'http://localhost';

async function runTests() {
  console.log('🧪 Starting E2E Venue Management Integration Tests...\n');

  let adminToken = '';
  let ownerToken = '';
  let venueId = '';
  let venueSlug = '';

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

  // 3. CREATE VENUE (AS OWNER)
  console.log('\n3. Creating new Venue listing (as Owner)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Ocean Breeze Luxury Villa',
        description: 'Stunning cliffside beach villa featuring infinity pool, private beach path, and fully equipped catering kitchen.',
        venueType: 'resort',
        category: 'Beach Escapes',
        address: {
          street: '15 Cliffside Road, Anjuna',
          city: 'Goa',
          state: 'Goa',
          zipCode: '403509',
          country: 'India',
        },
        location: {
          coordinates: [73.7423, 15.5828], // [longitude, latitude]
        },
        capacity: 150,
        pricing: {
          pricePerDay: 95000,
          securityDeposit: 30000,
          cleaningFee: 5000,
        },
        amenities: ['WiFi', 'Air Conditioning', 'Outdoor Lawn', 'Swimming Pool', 'Catering Kitchen'],
        policies: ['Events must conclude by 11:30 PM', 'Pet friendly with deposit'],
        images: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ],
        publicationStatus: 'PUBLISHED',
      }),
    });

    const json = await res.json();
    console.log(`Status: ${res.status}`);
    
    if (res.status !== 201) throw new Error(`Creation failed: ${JSON.stringify(json)}`);
    venueId = json.data.venue._id;
    venueSlug = json.data.venue.slug;
    
    console.log('✅ Venue created successfully.');
    console.log(`ID: ${venueId} | Slug: ${venueSlug}`);
    console.log(`Initial Approval Status: ${json.data.venue.approvalStatus} (Expected: PENDING)`);
    
    if (json.data.venue.approvalStatus !== 'PENDING') {
      throw new Error('Approval status is not PENDING');
    }
  } catch (err) {
    console.error('❌ Venue creation failed:', err.message);
    process.exit(1);
  }

  // 4. VERIFY PENDING VENUE IS HIDDEN FROM PUBLIC BROWSE
  console.log('\n4. Checking if PENDING venue is hidden from public browse...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues`);
    const json = await res.json();
    
    const found = json.data.venues.some(v => v._id === venueId);
    console.log(`Found in public browse: ${found ? 'YES' : 'NO'} (Expected: NO)`);
    if (found) {
      throw new Error('PENDING venue is visible in public browse.');
    }
    console.log('✅ Correctly hidden from guest browse.');
  } catch (err) {
    console.error('❌ Public visibility check failed:', err.message);
    process.exit(1);
  }

  // 5. VIEW VENUE APPROVAL QUEUE (AS ADMIN)
  console.log('\n5. Fetching approval queue (as Admin)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues?approvalStatus=PENDING`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    
    const found = json.data.venues.find(v => v._id === venueId);
    console.log(`Found in Admin queue: ${found ? 'YES' : 'NO'} (Expected: YES)`);
    if (!found) {
      throw new Error('Venue not listed in Admin queue.');
    }
    console.log('✅ Listed in Admin approval queue.');
  } catch (err) {
    console.error('❌ Admin queue retrieval failed:', err.message);
    process.exit(1);
  }

  // 6. APPROVE VENUE (AS ADMIN)
  console.log('\n6. Approving Venue (as Admin)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/admin/venues/${venueId}/approve`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    
    if (res.status !== 200) throw new Error('Approval request failed');
    console.log(`Approved status: ${json.data.venue.approvalStatus} (Expected: APPROVED)`);
    if (json.data.venue.approvalStatus !== 'APPROVED') {
      throw new Error('Status was not updated to APPROVED');
    }
    console.log('✅ Venue approved successfully.');
  } catch (err) {
    console.error('❌ Venue approval failed:', err.message);
    process.exit(1);
  }

  // 7. VERIFY APPROVED VENUE SHOWS UP IN PUBLIC BROWSE
  console.log('\n7. Checking if APPROVED venue is visible in public browse...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues`);
    const json = await res.json();
    
    const found = json.data.venues.find(v => v._id === venueId);
    console.log(`Found in public browse: ${found ? 'YES' : 'NO'} (Expected: YES)`);
    if (!found) {
      throw new Error('Approved venue not showing in public browse.');
    }
    console.log('✅ Venue visible in public browse.');
  } catch (err) {
    console.error('❌ Public visibility check failed:', err.message);
    process.exit(1);
  }

  // 8. UPDATE VENUE PRICE (AS OWNER)
  console.log('\n8. Updating venue pricing (as Owner)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues/${venueId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pricing: {
          pricePerDay: 110000,
        },
        capacity: 180,       // Update capacity
      }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    
    if (res.status !== 200) throw new Error('Update failed');
    console.log(`Updated pricing.pricePerDay: ₹${json.data.venue.pricing.pricePerDay} (Expected: 110000)`);
    console.log(`Updated capacity: ${json.data.venue.capacity} (Expected: 180)`);
    console.log(`Approval Status reset: ${json.data.venue.approvalStatus} (Expected: PENDING)`);
    
    if (json.data.venue.pricing.pricePerDay !== 110000 || json.data.venue.approvalStatus !== 'PENDING') {
      throw new Error('Update values or approval status reset failed.');
    }
    console.log('✅ Venue details updated successfully.');
  } catch (err) {
    console.error('❌ Venue update failed:', err.message);
    process.exit(1);
  }

  // 9. RE-APPROVE VENUE FOR DELETION CHECKS
  console.log('\n9. Re-approving Venue (as Admin)...');
  try {
    await fetch(`${baseUrl}/api/v1/admin/venues/${venueId}/approve`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Re-approved.');
  } catch (err) {
    console.error('❌ Re-approval failed:', err.message);
    process.exit(1);
  }

  // 10. TEST MUTATION LOCK GUARD (TRYING TO UPDATE OWNER\'S VENUE AS OTHER USER)
  console.log('\n10. Testing mutation lock guard (Updating owner\'s venue as Admin)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues/${venueId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pricePerDay: 5000,
      }),
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(json));
    
    if (res.status !== 403) {
      throw new Error('Admin was incorrectly allowed to mutate Owner\'s venue.');
    }
    console.log('✅ Correctly blocked (Status 403).');
  } catch (err) {
    console.error('❌ Mutation lock guard check failed:', err.message);
    process.exit(1);
  }

  // 11. SOFT DELETE VENUE (AS OWNER)
  console.log('\n11. Deleting Venue (as Owner)...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues/${venueId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    console.log(`Status: ${res.status}`);
    
    if (res.status !== 200) throw new Error('Soft delete request failed');
    console.log('✅ Venue deleted successfully.');
  } catch (err) {
    console.error('❌ Soft delete check failed:', err.message);
    process.exit(1);
  }

  // 12. VERIFY SOFT-DELETED VENUE IS ABSENT FROM PUBLIC BROWSE
  console.log('\n12. Checking if deleted venue is absent from public browse...');
  try {
    const res = await fetch(`${baseUrl}/api/v1/venues`);
    const json = await res.json();
    
    const found = json.data.venues.some(v => v._id === venueId);
    console.log(`Found in public browse: ${found ? 'YES' : 'NO'} (Expected: NO)`);
    if (found) {
      throw new Error('Soft-deleted venue is still showing in public search list!');
    }
    console.log('✅ Successfully confirmed absent.');
  } catch (err) {
    console.error('❌ Soft-delete verification failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 E2E Venue Management Integration Tests passed successfully!');
}

runTests();
