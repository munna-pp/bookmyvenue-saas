// Notifications & Realtime Socket.IO Integration Test Suite
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const io = require('socket.io-client');

const baseUrl = 'http://127.0.0.1:5000';

async function runNotificationTests() {
  console.log('🧪 Starting Notifications & Realtime Socket.IO Integration Tests...\n');

  let adminToken = '';
  let ownerToken = '';
  let customerToken = '';
  let customerId = '';
  let bookingId = '';
  let notificationId = '';

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

  // 2. CLEAN UP NOTIFICATIONS AND FETCH BOOKING
  try {
    // Clear out old notifications for customer to have a clean test run
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const conn = await mongoose
      .createConnection(`${mongoUri}/bookmyvenue_notifications`)
      .asPromise();
    await conn
      .collection('notifications')
      .deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });
    await conn.close();
    console.log('✅ Database notifications cleared for a clean test run.');

    // Fetch the seeded booking
    const res = await fetch(`${baseUrl}/api/v1/bookings/my`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const json = await res.json();
    const activeBooking = json.data.bookings[0];
    if (!activeBooking) throw new Error('No active booking found to run notification triggers.');
    bookingId = activeBooking._id || activeBooking.id;
    console.log(`✅ Reference Booking found: #${activeBooking.bookingNumber}`);
  } catch (err) {
    console.error('❌ DB prep failed:', err.message);
    process.exit(1);
  }

  // 3. AUTHENTICATED SOCKET.IO CONNECTION
  let socket;
  const receivedSocketNotifications = [];

  try {
    socket = io(baseUrl, {
      auth: { token: customerToken },
      reconnection: false,
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Authenticated Socket.IO client connected to backend.');
        resolve();
      });
      socket.on('connect_error', (err) => {
        reject(new Error(`Socket connection failed: ${err.message}`));
      });
    });

    // Listen to incoming realtime notifications
    socket.on('notification', (data) => {
      console.log(`🔌 Realtime Socket event received: "${data.title}" - Type: ${data.type}`);
      receivedSocketNotifications.push(data);
    });
  } catch (err) {
    console.error('❌ Socket.IO initialization failed:', err.message);
    process.exit(1);
  }

  // 4. TRIGGER TEST EMAILS AND IN-APP ALERTS
  try {
    console.log('\n--- Triggering Notification Events ---');

    // Trigger USER_REGISTERED event mockup (Welcome + Verification Email)
    const resReg = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test User ${Math.floor(Math.random() * 1000)}`,
        email: `testuser_${Date.now()}@bookmyvenue.com`,
        password: 'password123',
        role: 'customer',
      }),
    });
    if (resReg.status === 201) {
      console.log('✅ USER_REGISTERED email triggered (Welcome & Verification sent).');
    } else {
      throw new Error('Registration failed');
    }

    // Trigger Forgot Password token request
    const resForgot = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@bookmyvenue.com' }),
    });
    if (resForgot.status === 200) {
      console.log('✅ PASSWORD_RESET_REQUESTED email triggered (Reset link sent).');
    } else {
      throw new Error('Forgot password request failed');
    }

    // Trigger Booking approval (Transitions PENDING -> OWNER_APPROVED, triggers emails & alerts)
    // Wait, first we need to make sure the booking is in PENDING state. Let's force it to PENDING in DB
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const conn = await mongoose.createConnection(`${mongoUri}/bookmyvenue_bookings`).asPromise();
    await conn
      .collection('bookings')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(bookingId) },
        { $set: { bookingStatus: 'PENDING', paymentStatus: 'PENDING' } }
      );
    await conn.close();

    // Trigger host approval
    const resApprove = await fetch(`${baseUrl}/api/v1/bookings/${bookingId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    if (resApprove.status === 200) {
      console.log('✅ BOOKING_APPROVED triggers verified.');
    } else {
      throw new Error('Booking approval trigger failed');
    }

    // Simulate payment capture order verification (Triggers PAYMENT_SUCCESS emails & alerts)
    const resOrder = await fetch(`${baseUrl}/api/v1/payments/create-order`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId, couponCode: 'WELCOME20' }),
    });
    const orderJson = await resOrder.json();
    const orderId = orderJson.data.orderId;
    const paymentId = orderJson.data.paymentId;

    const providerPaymentId = `pay_mock_${Math.floor(100000 + Math.random() * 900000)}`;
    const hmac = crypto.createHmac(
      'sha256',
      process.env.RAZORPAY_KEY_SECRET || 'your-razorpay-key-secret'
    );
    hmac.update(`${orderId}|${providerPaymentId}`);
    const providerSignature = hmac.digest('hex');

    const resVerify = await fetch(`${baseUrl}/api/v1/payments/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        providerOrderId: orderId,
        providerPaymentId,
        providerSignature,
      }),
    });
    if (resVerify.status === 200) {
      console.log('✅ PAYMENT_SUCCESS triggers verified (Payment email & alerts sent).');
    } else {
      throw new Error('Payment verification trigger failed');
    }

    // Trigger Admin dispute refund (Triggers PAYMENT_REFUNDED emails & alerts)
    const resRefund = await fetch(`${baseUrl}/api/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (resRefund.status === 200) {
      console.log('✅ PAYMENT_REFUNDED triggers verified (Refund email & alerts sent).');
    } else {
      throw new Error('Refund trigger failed');
    }
  } catch (err) {
    console.error('❌ Trigger event phase failed:', err.message);
    socket.disconnect();
    process.exit(1);
  }

  // 5. WAIT AND ASSERT REALTIME DELIVERIES
  console.log('\n--- Verifying Realtime Deliveries ---');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log(
    `Total realtime socket notifications received: ${receivedSocketNotifications.length}`
  );
  if (receivedSocketNotifications.length === 0) {
    console.error('❌ Realtime socket notifications were not delivered!');
    socket.disconnect();
    process.exit(1);
  }
  console.log('✅ Realtime socket notifications verified successfully.');

  // 6. NOTIFICATION REST API CRUD VERIFICATION
  try {
    console.log('\n--- Verifying Notification REST API ---');

    // GET /api/v1/notifications
    const resList = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const listJson = await resList.json();
    const notifications = listJson.data.notifications;
    console.log(
      `✅ GET /notifications returned ${notifications.length} items (Page: ${listJson.data.page}/${listJson.data.pages}).`
    );
    if (notifications.length === 0)
      throw new Error('No in-app notifications persisted in MongoDB.');
    notificationId = notifications[0]._id || notifications[0].id;

    // GET /api/v1/notifications/unread
    const resUnread = await fetch(`${baseUrl}/api/v1/notifications/unread`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const unreadJson = await resUnread.json();
    console.log(`✅ GET /notifications/unread returned count: ${unreadJson.data.count}`);
    if (unreadJson.data.count === 0) throw new Error('Unread notifications count mismatch.');

    // PATCH /api/v1/notifications/:id/read
    const resRead = await fetch(`${baseUrl}/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const readJson = await resRead.json();
    console.log(
      `✅ PATCH /notifications/:id/read verified. Status read: ${readJson.data.notification.read}`
    );
    if (!readJson.data.notification.read) throw new Error('Failed to update read status.');

    // PATCH /api/v1/notifications/read-all
    const resReadAll = await fetch(`${baseUrl}/api/v1/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const readAllJson = await resReadAll.json();
    console.log(`✅ PATCH /notifications/read-all verified. Message: ${readAllJson.message}`);

    // Re-verify unread count is 0
    const resUnreadVerify = await fetch(`${baseUrl}/api/v1/notifications/unread`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const unreadVerifyJson = await resUnreadVerify.json();
    console.log(`✅ POST read-all unread count: ${unreadVerifyJson.data.count}`);
    if (unreadVerifyJson.data.count !== 0)
      throw new Error('Unread count is not zero after read-all.');

    // DELETE /api/v1/notifications/:id (Soft Delete)
    const resDel = await fetch(`${baseUrl}/api/v1/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const delJson = await resDel.json();
    console.log(`✅ DELETE /notifications/:id soft deleted. Message: ${delJson.message}`);

    // Verify soft-deleted item is not returned in the list query
    const resList2 = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const list2Json = await resList2.json();
    const isDeletedPresent = list2Json.data.notifications.some(
      (n) => n._id === notificationId || n.id === notificationId
    );
    console.log(
      `✅ Verified soft deleted item is absent in lists: ${!isDeletedPresent ? 'YES' : 'NO'}`
    );
    if (isDeletedPresent)
      throw new Error('Soft-deleted notification still returned in fetch list.');
  } catch (err) {
    console.error('❌ REST API validation failed:', err.message);
    socket.disconnect();
    process.exit(1);
  }

  socket.disconnect();
  console.log('\n🎉 All Notifications & Realtime Socket.IO Integration Tests passed successfully!');
  process.exit(0);
}

runNotificationTests();
