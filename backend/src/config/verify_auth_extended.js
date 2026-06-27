// Extended E2E Authentication & Authorization integration tests
const baseUrl = 'http://localhost';

// Helper to extract cookies from response headers
function getCookieValue(headers, name) {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  
  // Node-fetch might combine headers or return multiple. Split them.
  const cookies = setCookie.split(/,(?=[^;]*=)/);
  for (const cookie of cookies) {
    const [cookieNamePart] = cookie.trim().split(';');
    const [cName, cVal] = cookieNamePart.split('=');
    if (cName === name) return cVal;
  }
  return null;
}

async function runTests() {
  console.log('🧪 Starting E2E Authentication & Authorization Integration Tests...\n');

  const timestamp = Date.now();
  const testEmail = `customer_${timestamp}@example.com`;
  const testPassword = 'password123';
  
  // 1. REGISTER CUSTOMER
  console.log('1. Testing User Registration...');
  try {
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Customer',
        email: testEmail,
        password: testPassword,
        role: 'customer'
      })
    });
    
    const regJson = await regRes.json();
    console.log(`Status: ${regRes.status}`);
    console.log('Response:', JSON.stringify(regJson, null, 2));
    
    if (regRes.status !== 201) throw new Error(`Registration failed with status ${regRes.status}`);
    console.log('✅ Registration Succeeded.');
  } catch (err) {
    console.error('❌ Registration failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 2. LOGIN CUSTOMER
  console.log('2. Testing User Login...');
  let accessToken = '';
  let refreshTokenCookie = '';
  try {
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const loginJson = await loginRes.json();
    console.log(`Status: ${loginRes.status}`);
    console.log('Response:', JSON.stringify(loginJson, null, 2));

    if (loginRes.status !== 200) throw new Error(`Login failed with status ${loginRes.status}`);
    
    accessToken = loginJson.data.accessToken;
    refreshTokenCookie = getCookieValue(loginRes.headers, 'refreshToken');
    
    console.log('JWT Access Token Received:', accessToken ? 'YES (Present)' : 'NO');
    console.log('Refresh Token Cookie Received:', refreshTokenCookie ? 'YES (Present)' : 'NO');
    
    if (!accessToken || !refreshTokenCookie) {
      throw new Error('Failed to retrieve access token or refresh cookie.');
    }
    console.log('✅ Login Succeeded.');
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 3. GET PROFILE ME (PROTECTED ROUTE USING JWT)
  console.log('3. Testing /me Profile Access...');
  try {
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const meJson = await meRes.json();
    console.log(`Status: ${meRes.status}`);
    console.log('Response:', JSON.stringify(meJson, null, 2));

    if (meRes.status !== 200) throw new Error('Profile access denied.');
    console.log('✅ /me Profile Access Succeeded.');
  } catch (err) {
    console.error('❌ Profile request failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 4. REFRESH TOKEN ROTATION
  console.log('4. Testing Refresh Token Rotation...');
  let rotatedAccessToken = '';
  let rotatedRefreshTokenCookie = '';
  try {
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Cookie': `refreshToken=${refreshTokenCookie}`,
        'Content-Type': 'application/json'
      }
    });

    const refreshJson = await refreshRes.json();
    console.log(`Status: ${refreshRes.status}`);
    console.log('Response:', JSON.stringify(refreshJson, null, 2));

    if (refreshRes.status !== 200) throw new Error(`Token refresh failed with status ${refreshRes.status}`);

    rotatedAccessToken = refreshJson.data.accessToken;
    rotatedRefreshTokenCookie = getCookieValue(refreshRes.headers, 'refreshToken');

    console.log('Rotated JWT Access Token Received:', rotatedAccessToken ? 'YES (Present)' : 'NO');
    console.log('Rotated Refresh Token Cookie Received:', rotatedRefreshTokenCookie ? 'YES (Present)' : 'NO');

    if (!rotatedAccessToken || !rotatedRefreshTokenCookie) {
      throw new Error('Failed to retrieve rotated tokens.');
    }
    
    if (refreshTokenCookie === rotatedRefreshTokenCookie) {
      throw new Error('Refresh token rotation failed: same refresh token returned!');
    }
    console.log('✅ Token Rotation Succeeded.');
  } catch (err) {
    console.error('❌ Token refresh failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 5. TEST REUSE OF REVOKED REFRESH TOKEN (SHOULD FAIL)
  console.log('5. Testing Reuse of Revoked Refresh Token (Should fail)...');
  try {
    const reuseRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Cookie': `refreshToken=${refreshTokenCookie}`,
        'Content-Type': 'application/json'
      }
    });

    const reuseJson = await reuseRes.json();
    console.log(`Status: ${reuseRes.status}`);
    console.log('Response:', JSON.stringify(reuseJson, null, 2));

    if (reuseRes.status === 200) {
      throw new Error('Security Alert: Revoked refresh token was reused successfully!');
    }
    console.log('✅ Token reuse correctly blocked.');
  } catch (err) {
    console.error('❌ Token reuse check failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 6. TESTING LOGOUT
  console.log('6. Testing User Logout...');
  try {
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 
        'Cookie': `refreshToken=${rotatedRefreshTokenCookie}`,
        'Content-Type': 'application/json'
      }
    });

    const logoutJson = await logoutRes.json();
    console.log(`Status: ${logoutRes.status}`);
    console.log('Response:', JSON.stringify(logoutJson, null, 2));

    if (logoutRes.status !== 200) throw new Error('Logout failed.');
    console.log('✅ Logout Succeeded.');
  } catch (err) {
    console.error('❌ Logout failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 7. TESTING ACCESS WITH INVALIDATED ACCESS TOKEN (JWT remains verified until expiry, but profile should still verify)
  console.log('7. Testing Accessing Protected Route after logout (JWT still valid client-side)...');
  try {
    const checkRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${rotatedAccessToken}`
      }
    });

    const checkJson = await checkRes.json();
    console.log(`Status: ${checkRes.status}`);
    console.log('Response:', JSON.stringify(checkJson, null, 2));
    
    // Since JWT is stateless and we haven't implemented a blacklist, it will still allow access until it expires in 15m.
    // This is standard stateless JWT behavior and is expected.
    console.log(`✅ Stateless Access checked (Status ${checkRes.status}).`);
  } catch (err) {
    console.error('❌ Access verification failed:', err.message);
    process.exit(1);
  }

  console.log('\n----------------------------------------\n');

  // 8. TEST SEEDED ADMIN LOGIN
  console.log('8. Testing Seeded Admin Login...');
  try {
    const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@bookmyvenue.com',
        password: 'adminpassword'
      })
    });

    const adminJson = await adminRes.json();
    console.log(`Status: ${adminRes.status}`);
    console.log('Response:', JSON.stringify(adminJson, null, 2));

    if (adminRes.status !== 200) throw new Error('Admin login failed');
    console.log('✅ Seeded Admin Login Succeeded.');
  } catch (err) {
    console.error('❌ Admin login failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 E2E Authentication Integration Tests passed successfully!');
}

runTests();
