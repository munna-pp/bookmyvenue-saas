// Payments & Invoices E2E Integration Test Suite
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const baseUrl = 'http://127.0.0.1:5000';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'your-razorpay-key-secret';

async function runPaymentTests() {
  console.log('🧪 Starting Payments & Invoices Integration Tests...\n');

  let adminToken = '';
  let ownerToken = '';
  let customerToken = '';
  let bookingId = '';
  let paymentId = '';
  let orderId = '';
  let invoiceId = '';

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

    console.log('✅ Logins completed successfully.');
  } catch (err) {
    console.error('❌ Login phase failed:', err.message);
    process.exit(1);
  }

  // 2. FETCH SEEDED BOOKING IN PENDING STAGE
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings/my`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const json = await res.json();
    const pending = json.data.bookings.find((b) => b.bookingStatus === 'PENDING');
    if (!pending) throw new Error('Seeded pending booking not found in database.');
    bookingId = pending._id || pending.id;
    console.log(`✅ Seeded Booking Found: ID: ${bookingId} | Number: ${pending.bookingNumber}`);
  } catch (err) {
    console.error('❌ Failed to fetch seeded bookings:', err.message);
    process.exit(1);
  }

  // 3. APPROVE BOOKING AS OWNER (Transition to OWNER_APPROVED so it can be paid)
  try {
    const res = await fetch(`${baseUrl}/api/v1/bookings/${bookingId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    if (res.status !== 200) throw new Error('Host approval failed');
    console.log('✅ Booking transitioned to OWNER_APPROVED by host.');
  } catch (err) {
    console.error('❌ Pre-checkout approval failed:', err.message);
    process.exit(1);
  }

  // 4. APPLY COUPON WELCOME20
  try {
    const res = await fetch(`${baseUrl}/api/v1/coupons/apply`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'WELCOME20', bookingId }),
    });
    const json = await res.json();
    if (res.status !== 200) throw new Error(json.message || 'Coupon validation failed');
    console.log(
      `✅ Coupon WELCOME20 applied. Discount: ₹${json.data.discount} | New Total: ₹${json.data.newTotal}`
    );
  } catch (err) {
    console.error('❌ Coupon application failed:', err.message);
    process.exit(1);
  }

  // 5. CREATE ORDER
  try {
    const res = await fetch(`${baseUrl}/api/v1/payments/create-order`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId, couponCode: 'WELCOME20' }),
    });
    const json = await res.json();
    if (res.status !== 201) throw new Error(json.message);
    paymentId = json.data.paymentId;
    orderId = json.data.orderId;
    console.log(`✅ Order registered. Order ID: ${orderId} | Payment ID: ${paymentId}`);
  } catch (err) {
    console.error('❌ Order creation failed:', err.message);
    process.exit(1);
  }

  // 6. VERIFY PAYMENT (SIMULATE RAZORPAY TEST CALLBACK)
  try {
    const providerPaymentId = `pay_mock_${Math.floor(100000 + Math.random() * 900000)}`;

    // Generate valid HMAC signature
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${providerPaymentId}`);
    const providerSignature = hmac.digest('hex');

    const res = await fetch(`${baseUrl}/api/v1/payments/verify`, {
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
    const json = await res.json();
    if (res.status !== 200) throw new Error(json.message);
    invoiceId = json.data.invoice.invoiceNumber;
    console.log(`✅ Payment verified. Status transitions to CONFIRMED succeeded.`);
    console.log(`Generated Invoice Number: ${invoiceId}`);
  } catch (err) {
    console.error('❌ Payment verification failed:', err.message);
    process.exit(1);
  }

  // 7. CHECK WALLET CREDIT & LEDGER HISTORY
  try {
    const res = await fetch(`${baseUrl}/api/v1/payments/wallet`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const json = await res.json();
    console.log(`✅ Host Wallet Balance synced: ₹${json.data.balance}`);
    console.log(`Wallet ledger count: ${json.data.ledger.length} entries.`);
    const credit = json.data.ledger.find((tx) => tx.type === 'CREDIT');
    if (!credit) throw new Error('Credit payout ledger entry not found.');
    console.log(`Payout transaction: ${credit.description} | Amount: ₹${credit.amount}`);
  } catch (err) {
    console.error('❌ Wallet audit checks failed:', err.message);
    process.exit(1);
  }

  // 8. DOWNLOAD PDF INVOICE
  try {
    const res = await fetch(`${baseUrl}/api/v1/invoices/download/${invoiceId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (res.status !== 200) throw new Error('PDF download endpoint returned error');

    const buffer = await res.arrayBuffer();
    console.log(`✅ Downloaded Invoice PDF file. Length: ${buffer.byteLength} bytes.`);

    // Check if buffer contains PDF magic header
    const pdfHeader = Buffer.from(buffer).slice(0, 4).toString();
    console.log(`PDF Magic Header matches: ${pdfHeader === '%PDF' ? 'YES' : 'NO'}`);
    if (pdfHeader !== '%PDF') throw new Error('File buffer is not a valid PDF header format');
  } catch (err) {
    console.error('❌ Invoice download failed:', err.message);
    process.exit(1);
  }

  // 9. ADMIN TRIGGER DISPUTE REFUND
  try {
    const res = await fetch(`${baseUrl}/api/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const json = await res.json();
    if (res.status !== 200) throw new Error(json.message || 'Refund failed');
    console.log(`✅ Dispute Refund triggered. Payment status: ${json.data.payment.status}`);
  } catch (err) {
    console.error('❌ Admin refund dispatcher failed:', err.message);
    process.exit(1);
  }

  // 10. RE-AUDIT WALLET LEDGER POST REFUND
  try {
    const res = await fetch(`${baseUrl}/api/v1/payments/wallet`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const json = await res.json();
    console.log(`✅ Post-refund Host Wallet Balance: ₹${json.data.balance}`);
    const refundTx = json.data.ledger.find((tx) => tx.type === 'REFUND');
    if (!refundTx) throw new Error('Refund debit ledger entry not found.');
    console.log(`Refund transaction: ${refundTx.description} | Amount: ₹${refundTx.amount}`);
  } catch (err) {
    console.error('❌ Wallet post-refund audit checks failed:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 All Payments & Invoices E2E Integration Tests passed successfully!');
}

runPaymentTests();
