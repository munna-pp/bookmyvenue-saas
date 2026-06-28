import nodemailer from 'nodemailer';
import { config } from '../../../config/index.js';
import { logger } from '../../../utils/logger.js';

// Create Nodemailer Transporter
const createTransporter = () => {
  // Support custom configurations or Mailtrap sandbox defaults
  return nodemailer.createTransport({
    host: config.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(config.SMTP_PORT) || 2525,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

// Helper to wrap content in a BookMyVenue branded HTML template
const wrapHtmlTemplate = (title: string, bodyContent: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            border: 1px border border-slate-100;
          }
          .header {
            background-color: #4f46e5;
            color: #ffffff;
            padding: 32px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .badge {
            background-color: rgba(255, 255, 255, 0.2);
            color: #ffffff;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 9999px;
            display: inline-block;
            margin-top: 6px;
            font-weight: 500;
          }
          .content {
            padding: 40px 32px;
            line-height: 1.6;
            font-size: 15px;
          }
          .footer {
            background-color: #f1f5f9;
            color: #64748b;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .btn {
            background-color: #4f46e5;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            display: inline-block;
            margin-top: 16px;
          }
          .btn:hover {
            background-color: #4338ca;
          }
          hr {
            border: 0;
            border-top: 1px solid #e2e8f0;
            margin: 24px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BookMyVenue</h1>
            <span class="badge">SaaS Booking Platform</span>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p>&copy; 2026 BookMyVenue. All rights reserved.</p>
            <p>102 Palace Road, Bandra West, Mumbai, Maharashtra, India</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Interface for mail options
export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Low-level send mail method
export const sendMail = async (payload: MailPayload): Promise<void> => {
  const mailOptions = {
    from: config.SMTP_FROM || '"BookMyVenue" <noreply@bookmyvenue.com>',
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  try {
    logger.info(`📧 Attempting to send email to ${payload.to} with subject: "${payload.subject}"`);
    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email successfully sent to ${payload.to}. Message ID: ${info.messageId}`);
  } catch (error) {
    logger.error(`❌ Failed to send email to ${payload.to}:`, error);
  }
};

// 1. Welcome Email
export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  const title = 'Welcome to BookMyVenue!';
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hello ${name},</h2>
     <p>Welcome to BookMyVenue! We are thrilled to have you join our premium venue booking community.</p>
     <p>Whether you're planning a luxurious wedding, convention halls, Banquets, or corporate events, we provide premium spaces to bring your visions to life.</p>
     <p>Get started by exploring our featured venues:</p>
     <a href="${config.NODE_ENV === 'production' ? '/' : 'http://localhost:3000'}/venues" class="btn">Explore Venues</a>`
  );
  const text = `Hello ${name},\n\nWelcome to BookMyVenue! We are thrilled to have you join our premium venue booking community.`;
  await sendMail({ to, subject: title, html, text });
};

// 2. Email Verification
export const sendVerificationEmail = async (to: string, name: string, token: string): Promise<void> => {
  const title = 'Verify Your Email Address';
  const url = `${config.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}/api/v1/auth/verify-email?token=${token}`;
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hi ${name},</h2>
     <p>Please verify your email address to activate your BookMyVenue account.</p>
     <p>Click the button below to confirm your address:</p>
     <a href="${url}" class="btn">Confirm Email</a>
     <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Or copy this link: <a href="${url}">${url}</a></p>`
  );
  const text = `Hi ${name},\n\nPlease verify your email address using this link: ${url}`;
  await sendMail({ to, subject: title, html, text });
};

// 3. Forgot Password Email
export const sendForgotPasswordEmail = async (to: string, name: string, token: string): Promise<void> => {
  const title = 'Reset Your Password';
  const url = `${config.NODE_ENV === 'production' ? '' : 'http://localhost:3000'}/reset-password?token=${token}`;
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hi ${name},</h2>
     <p>We received a request to reset your BookMyVenue account password.</p>
     <p>Click the button below to choose a new password:</p>
     <a href="${url}" class="btn">Reset Password</a>
     <p style="margin-top: 24px; font-size: 12px; color: #64748b;">If you didn't request this password reset, please ignore this email.</p>`
  );
  const text = `Hi ${name},\n\nReset your password using this link: ${url}`;
  await sendMail({ to, subject: title, html, text });
};

// 4. Booking Request Received
export const sendBookingRequestEmail = async (
  to: string,
  ownerName: string,
  bookingNumber: string,
  venueTitle: string,
  eventDate: Date
): Promise<void> => {
  const title = 'New Booking Request Received';
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hello ${ownerName},</h2>
     <p>You have received a new booking query for <strong>${venueTitle}</strong>.</p>
     <p><strong>Booking Reference:</strong> #${bookingNumber}</p>
     <p><strong>Event Date:</strong> ${formattedDate}</p>
     <p>Please review and approve this booking request in your dashboard:</p>
     <a href="http://localhost:3002/owner/bookings" class="btn">View Bookings</a>`
  );
  const text = `Hello ${ownerName},\n\nYou have received a new booking query for ${venueTitle} (Ref: #${bookingNumber}) on ${formattedDate}.`;
  await sendMail({ to, subject: `[BookMyVenue] ${title} - #${bookingNumber}`, html, text });
};

// 5. Booking Approved
export const sendBookingApprovedEmail = async (
  to: string,
  customerName: string,
  bookingNumber: string,
  venueTitle: string,
  eventDate: Date
): Promise<void> => {
  const title = 'Your Booking Request Has Been Approved!';
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hi ${customerName},</h2>
     <p>Great news! The host has approved your booking query for <strong>${venueTitle}</strong>.</p>
     <p><strong>Booking Reference:</strong> #${bookingNumber}</p>
     <p><strong>Event Date:</strong> ${formattedDate}</p>
     <p>To secure your slot, please proceed to pay using Razorpay securely:</p>
     <a href="http://localhost:3000/bookings" class="btn">Proceed to Payment</a>`
  );
  const text = `Hi ${customerName},\n\nYour booking request for ${venueTitle} (Ref: #${bookingNumber}) on ${formattedDate} has been approved. Please pay to secure it.`;
  await sendMail({ to, subject: `[BookMyVenue] ${title} - #${bookingNumber}`, html, text });
};

// 6. Booking Rejected
export const sendBookingRejectedEmail = async (
  to: string,
  customerName: string,
  bookingNumber: string,
  venueTitle: string,
  eventDate: Date,
  reason?: string
): Promise<void> => {
  const title = 'Booking Request Declined';
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hi ${customerName},</h2>
     <p>We regret to inform you that your booking query for <strong>${venueTitle}</strong> has been declined by the host.</p>
     <p><strong>Booking Reference:</strong> #${bookingNumber}</p>
     <p><strong>Event Date:</strong> ${formattedDate}</p>
     ${reason ? `<p><strong>Reason for rejection:</strong> ${reason}</p>` : ''}
     <p>Feel free to browse other matching spaces:</p>
     <a href="http://localhost:3000/venues" class="btn">Browse Venues</a>`
  );
  const text = `Hi ${customerName},\n\nYour booking request for ${venueTitle} (Ref: #${bookingNumber}) on ${formattedDate} was declined.`;
  await sendMail({ to, subject: `[BookMyVenue] ${title} - #${bookingNumber}`, html, text });
};

// 7. Booking Cancelled
export const sendBookingCancelledEmail = async (
  to: string,
  name: string,
  bookingNumber: string,
  venueTitle: string,
  eventDate: Date,
  cancelledBy: string,
  reason?: string
): Promise<void> => {
  const title = 'Booking Query Cancelled';
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hello ${name},</h2>
     <p>The booking query #${bookingNumber} for <strong>${venueTitle}</strong> has been cancelled by <strong>${cancelledBy}</strong>.</p>
     <p><strong>Event Date:</strong> ${formattedDate}</p>
     ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}`
  );
  const text = `Hello ${name},\n\nBooking query #${bookingNumber} for ${venueTitle} was cancelled by ${cancelledBy}.`;
  await sendMail({ to, subject: `[BookMyVenue] ${title} - #${bookingNumber}`, html, text });
};

// 8. Payment Successful
export const sendPaymentSuccessfulEmail = async (
  to: string,
  customerName: string,
  bookingNumber: string,
  amount: number,
  invoiceNumber: string
): Promise<void> => {
  const title = 'Payment Confirmed & Invoice Issued';
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hi ${customerName},</h2>
     <p>Thank you! Your payment of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been verified successfully.</p>
     <p>Your booking #${bookingNumber} is now officially <strong>CONFIRMED</strong>.</p>
     <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
     <p>You can download the invoice PDF from your dashboard bookings page.</p>
     <a href="http://localhost:3000/bookings" class="btn">View My Bookings</a>`
  );
  const text = `Hi ${customerName},\n\nYour payment of ₹${amount} for booking #${bookingNumber} has been verified successfully (Invoice: ${invoiceNumber}).`;
  await sendMail({ to, subject: `[BookMyVenue] Payment Successful - #${bookingNumber}`, html, text });
};

// 9. Refund Processed
export const sendRefundProcessedEmail = async (
  to: string,
  customerName: string,
  bookingNumber: string,
  amount: number
): Promise<void> => {
  const title = 'Refund Processed Successfully';
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hi ${customerName},</h2>
     <p>This is to confirm that a refund of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been successfully processed for booking #${bookingNumber}.</p>
     <p>The money will be credited back to your account or wallet ledger.</p>`
  );
  const text = `Hi ${customerName},\n\nA refund of ₹${amount} has been successfully processed for booking #${bookingNumber}.`;
  await sendMail({ to, subject: `[BookMyVenue] Refund Processed - #${bookingNumber}`, html, text });
};

// 10. Venue Approved by Admin
export const sendVenueApprovedEmail = async (to: string, ownerName: string, venueTitle: string): Promise<void> => {
  const title = 'Your Venue Has Been Approved!';
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hello ${ownerName},</h2>
     <p>Congratulations! Your listing request for <strong>${venueTitle}</strong> has been reviewed and approved by the system administrators.</p>
     <p>Your venue is now live and published for customer reservations.</p>
     <a href="http://localhost:3002/owner/venues" class="btn">Manage Venues</a>`
  );
  const text = `Hello ${ownerName},\n\nYour venue "${venueTitle}" has been approved and is now live.`;
  await sendMail({ to, subject: `[BookMyVenue] Venue Approved - ${venueTitle}`, html, text });
};

// 11. Venue Rejected by Admin
export const sendVenueRejectedEmail = async (to: string, ownerName: string, venueTitle: string, reason?: string): Promise<void> => {
  const title = 'Venue Listing Request Declined';
  const html = wrapHtmlTemplate(
    title,
    `<h2>Hello ${ownerName},</h2>
     <p>We regret to inform you that your listing request for <strong>${venueTitle}</strong> was declined during review.</p>
     ${reason ? `<p><strong>Reason for rejection:</strong> ${reason}</p>` : ''}
     <p>Please edit the listing details and resubmit for approval:</p>
     <a href="http://localhost:3002/owner/venues" class="btn">Manage Venues</a>`
  );
  const text = `Hello ${ownerName},\n\nYour venue listing for "${venueTitle}" was declined.`;
  await sendMail({ to, subject: `[BookMyVenue] Venue Listing Declined - ${venueTitle}`, html, text });
};
