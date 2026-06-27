import Razorpay from 'razorpay';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { EventEmitter } from 'events';
import { config } from '../../../config/index.js';

// Initialize Razorpay
// Using Test keys loaded from env
export const razorpayInstance = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

// Event Emitter for Payment Events
export const paymentEvents = new EventEmitter();

/**
 * Verify Razorpay payment signature
 */
export const verifySignature = (orderId: string, paymentId: string, signature: string): boolean => {
  try {
    const hmac = crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const generated = hmac.digest('hex');
    return generated === signature;
  } catch {
    return false;
  }
};

/**
 * Verify Razorpay webhook signature
 */
export const verifyWebhookSignature = (payload: string, signature: string, webhookSecret: string): boolean => {
  try {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(payload);
    const generated = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
  } catch {
    return false;
  }
};

/**
 * Generate a professional invoice PDF buffer using PDFKit
 */
export const generateInvoicePdfBuffer = (
  invoice: any,
  booking: any,
  customer: any,
  venue: any
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Brand
      doc.fillColor('#4F46E5').fontSize(24).text('BookMyVenue', { align: 'left' });
      doc.fillColor('#6B7280').fontSize(10).text('Premium Venue Booking Solutions', { align: 'left' });
      doc.moveDown(1);

      // Invoice & Booking Info block
      doc.fillColor('#1F2937').fontSize(12).text('INVOICE DETAIL', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}`);
      doc.text(`Booking Reference: #${booking.bookingNumber}`);
      if (invoice.paymentId) {
        doc.text(`Payment ID: ${invoice.paymentId}`);
      }
      doc.moveDown(1.5);

      // Client details
      doc.fillColor('#1F2937').fontSize(12).text('BILL TO', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Customer Name: ${customer?.name || 'Jane Customer'}`);
      doc.text(`Customer Email: ${customer?.email || 'customer@bookmyvenue.com'}`);
      doc.moveDown(1.5);

      // Venue details
      doc.fillColor('#1F2937').fontSize(12).text('VENUE INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Venue Listing: ${venue?.title || 'Seeded Ballroom'}`);
      if (venue?.address) {
        doc.text(`Location Address: ${venue.address.street}, ${venue.address.city}, ${venue.address.state}`);
      }
      doc.moveDown(2);

      // Invoice Items Breakdown
      doc.fillColor('#1F2937').fontSize(12).text('PAYMENT BREAKDOWN', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151');
      
      doc.text(`Subtotal Rental Fee: INR ${invoice.subtotal.toLocaleString('en-IN')}`);
      doc.text(`18% GST Service Tax: INR ${invoice.gst.toLocaleString('en-IN')}`);
      
      if (invoice.discount > 0) {
        doc.fillColor('#B91C1C');
        doc.text(`Discount Coupon Deductions: -INR ${invoice.discount.toLocaleString('en-IN')}`);
        doc.fillColor('#374151');
      }
      
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#4F46E5').text(`Total Invoice Amount: INR ${invoice.total.toLocaleString('en-IN')}`);
      doc.font('Helvetica'); // Switch back to normal
      doc.moveDown(3);

      // Footer
      doc.fontSize(8).fillColor('#9CA3AF').text('This is a computer-generated transaction record. Thank you for choosing BookMyVenue.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
