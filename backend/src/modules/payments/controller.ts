import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Payment, IPayment } from './models/Payment.js';
import { Invoice } from './models/Invoice.js';
import { Coupon } from './models/Coupon.js';
import { WalletLedger } from './models/WalletLedger.js';
import { Booking, IBooking } from '../bookings/models/Booking.js';
import { Venue, IVenue } from '../venues/models/Venue.js';
import { User, IUser } from '../auth/models/User.js';
import {
  razorpayInstance,
  verifySignature,
  verifyWebhookSignature,
  generateInvoicePdfBuffer,
  paymentEvents,
} from './services/paymentService.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// Concurrency/Idempotency Webhook Set
const processedWebhookEvents = new Set<string>();

/**
 * Helper: dynamically stitch metadata for payments lists (in-memory join)
 */
const populatePaymentsMetadata = async (payments: IPayment[]): Promise<unknown[]> => {
  if (payments.length === 0) return [];

  const bookingIds = Array.from(new Set(payments.map((p) => p.bookingId.toString())));
  const customerIds = Array.from(new Set(payments.map((p) => p.customerId.toString())));
  const ownerIds = Array.from(new Set(payments.map((p) => p.ownerId.toString())));

  const [bookingsRaw, customers, owners] = await Promise.all([
    Booking.find({ _id: { $in: bookingIds } }).lean(),
    User.find({ _id: { $in: customerIds } })
      .select('name email')
      .lean(),
    User.find({ _id: { $in: ownerIds } })
      .select('name email')
      .lean(),
  ]);

  const bookings = bookingsRaw as unknown as IBooking[];

  // Stitch venue info onto bookings
  const venueIds = Array.from(new Set(bookings.map((b) => b.venueId.toString())));
  const venues = await Venue.find({ _id: { $in: venueIds } })
    .select('title slug address')
    .lean();

  const venueMap = new Map(venues.map((v) => [v._id.toString(), v]));
  const bookingMap = new Map(
    bookings.map((b) => {
      (b as unknown as Record<string, unknown>).venue = venueMap.get(b.venueId.toString()) || null;
      return [b._id.toString(), b];
    })
  );

  const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
  const ownerMap = new Map(owners.map((o) => [o._id.toString(), o]));

  return payments.map((p) => {
    const pObj = p.toObject ? p.toObject() : p;
    pObj.booking = bookingMap.get(p.bookingId.toString()) || null;
    pObj.customer = customerMap.get(p.customerId.toString()) || null;
    pObj.owner = ownerMap.get(p.ownerId.toString()) || null;
    return pObj;
  });
};

/**
 * POST /api/v1/coupons/apply
 * Validate and calculate coupon discount
 */
export const applyCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      next(new AppError('Booking not found', 404));
      return;
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      next(new AppError('Coupon is invalid or inactive', 400));
      return;
    }

    // Expiry check
    if (new Date() > new Date(coupon.expiryDate)) {
      next(new AppError('Coupon has expired', 400));
      return;
    }

    // Minimum amount check
    if (booking.subtotal < coupon.minimumBookingAmount) {
      next(
        new AppError(
          `Minimum booking amount of INR ${coupon.minimumBookingAmount} required for this coupon`,
          400
        )
      );
      return;
    }

    // Total usage limit check
    if (coupon.usageCount >= coupon.usageLimit) {
      next(new AppError('Coupon usage limit reached', 400));
      return;
    }

    // Per user usage check
    const userId = booking.customerId.toString();
    const userUsageCount = coupon.userUsage?.get(userId) || 0;
    if (userUsageCount >= coupon.perUserLimit) {
      next(new AppError('You have reached the usage limit for this coupon', 400));
      return;
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'FLAT') {
      discount = coupon.discount;
    } else if (coupon.type === 'PERCENTAGE') {
      discount = Math.round(booking.subtotal * (coupon.discount / 100));
      if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
      }
    }

    // Ensure discount doesn't exceed subtotal
    if (discount > booking.subtotal) {
      discount = booking.subtotal;
    }

    const newTotal =
      booking.subtotal +
      booking.taxes +
      (booking.pricingSnapshot.cleaningFee || 0) +
      (booking.pricingSnapshot.securityDeposit || 0) -
      discount;

    res.status(200).json({
      status: 'success',
      data: {
        couponId: coupon._id,
        code: coupon.code,
        discount,
        newTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/create-order
 * Create Razorpay Order & register Payment
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId, couponCode } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      next(new AppError('Booking not found', 404));
      return;
    }

    if (booking.bookingStatus !== 'OWNER_APPROVED' && booking.bookingStatus !== 'PAYMENT_PENDING') {
      next(
        new AppError(
          `Booking must be OWNER_APPROVED to proceed with payment. Current status: ${booking.bookingStatus}`,
          400
        )
      );
      return;
    }

    // 1. Calculate payable amount on backend (Never trust frontend)
    const subtotal = booking.subtotal;
    const taxes = booking.taxes;
    const cleaning = booking.pricingSnapshot.cleaningFee || 0;
    const deposit = booking.pricingSnapshot.securityDeposit || 0;

    let discount = 0;
    let couponId: Types.ObjectId | undefined = undefined;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (
        coupon &&
        new Date() <= new Date(coupon.expiryDate) &&
        subtotal >= coupon.minimumBookingAmount &&
        coupon.usageCount < coupon.usageLimit
      ) {
        const userId = booking.customerId.toString();
        const userUsageCount = coupon.userUsage?.get(userId) || 0;
        if (userUsageCount < coupon.perUserLimit) {
          couponId = coupon._id as Types.ObjectId;
          if (coupon.type === 'FLAT') {
            discount = coupon.discount;
          } else if (coupon.type === 'PERCENTAGE') {
            discount = Math.round(subtotal * (coupon.discount / 100));
            if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
              discount = coupon.maximumDiscount;
            }
          }
          if (discount > subtotal) discount = subtotal;
        }
      }
    }

    const totalAmount = subtotal + taxes + cleaning + deposit - discount;

    // 2. Create Order in Razorpay Test Mode
    // Razorpay expects amount in paise (multiply by 100)
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: booking.bookingNumber,
    };

    let rzpOrder;
    try {
      const isPlaceholder =
        config.RAZORPAY_KEY_ID.includes('placeholder') ||
        config.RAZORPAY_KEY_ID.startsWith('your-');
      if (isPlaceholder) {
        rzpOrder = {
          id: `order_mock_${Math.floor(100000 + Math.random() * 900000)}`,
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
        };
      } else {
        rzpOrder = await razorpayInstance.orders.create(options);
      }
    } catch (rzpErr) {
      logger.error('Razorpay Order Creation Failed:', rzpErr);
      next(new AppError('Failed to initialize payment gateway order.', 502));
      return;
    }

    // 3. Save pending payment record
    const payment = await Payment.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      ownerId: booking.ownerId,
      amount: totalAmount,
      currency: 'INR',
      provider: 'razorpay',
      providerOrderId: rzpOrder.id,
      status: 'PENDING',
      couponId,
    });

    // 4. Update Booking status to PAYMENT_PENDING
    booking.bookingStatus = 'PAYMENT_PENDING';
    booking.discount = discount;
    booking.totalAmount = totalAmount;
    booking.statusHistory.push({
      status: 'PAYMENT_PENDING',
      updatedAt: new Date(),
      updatedBy: req.user!._id,
      notes: `Razorpay Order ${rzpOrder.id} initialized.`,
    });
    await booking.save();

    // Emit event
    paymentEvents.emit('PAYMENT_CREATED', payment);

    res.status(201).json({
      status: 'success',
      data: {
        paymentId: payment._id,
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: config.RAZORPAY_KEY_ID, // Frontend needs this to open checkout modal
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/verify
 * Verify payment signature & complete booking
 */
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bookingId, providerOrderId, providerPaymentId, providerSignature } = req.body;

    // 1. Prevent duplicate payment processing
    const duplicate = await Payment.findOne({
      providerOrderId,
      status: 'SUCCESS',
    });
    if (duplicate) {
      next(new AppError('This transaction has already been captured and processed.', 400));
      return;
    }

    const payment = await Payment.findOne({ providerOrderId, status: 'PENDING' });
    if (!payment) {
      next(new AppError('Payment transaction record not found or already completed.', 404));
      return;
    }

    // 2. Signature verification
    const isValid = verifySignature(providerOrderId, providerPaymentId, providerSignature);
    if (!isValid) {
      payment.status = 'FAILED';
      payment.providerPaymentId = providerPaymentId;
      payment.providerSignature = providerSignature;
      await payment.save();

      // Update booking
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.statusHistory.push({
          status: 'PAYMENT_PENDING',
          updatedAt: new Date(),
          updatedBy: payment.customerId,
          notes: 'Razorpay checkout verification failed.',
        });
        await booking.save();
      }

      paymentEvents.emit('PAYMENT_FAILED', payment);
      next(new AppError('Payment signature verification failed.', 400));
      return;
    }

    // 3. Payment succeeded: update records
    payment.status = 'SUCCESS';
    payment.providerPaymentId = providerPaymentId;
    payment.providerSignature = providerSignature;

    // If coupon used, increment coupon limits
    if (payment.couponId) {
      const coupon = await Coupon.findById(payment.couponId);
      if (coupon) {
        coupon.usageCount += 1;
        const cIdStr = payment.customerId.toString();
        const curCount = coupon.userUsage.get(cIdStr) || 0;
        coupon.userUsage.set(cIdStr, curCount + 1);
        await coupon.save();
      }
    }

    // 4. Generate Professional serial Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `BMV-INV-${dateStr}-${rand}`;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      next(new AppError('Booking reference deleted during transaction capture.', 404));
      return;
    }

    // Calculate subtotal and tax parts
    const subtotal = booking.subtotal;
    const gst = booking.taxes;
    const discount = booking.discount;
    const total = booking.totalAmount;

    // Create Invoice Document
    const invoice = await Invoice.create({
      invoiceNumber,
      bookingId: booking._id,
      paymentId: payment._id,
      customerId: booking.customerId,
      ownerId: booking.ownerId,
      subtotal,
      gst,
      discount,
      total,
      pdfUrl: `/api/v1/invoices/download/${invoiceNumber}.pdf`, // Download route mapping
      status: 'PAID',
    });

    payment.invoiceId = invoice._id as Types.ObjectId;
    await payment.save();

    // 5. Transition booking state to CONFIRMED
    booking.bookingStatus = 'CONFIRMED';
    booking.paymentStatus = 'PAID';
    booking.statusHistory.push({
      status: 'CONFIRMED',
      updatedAt: new Date(),
      updatedBy: payment.customerId,
      notes: `Payment verified. Transaction Ref: ${providerPaymentId}.`,
    });
    await booking.save();

    // 6. Record CREDIT entry inside Wallet Ledger (immutable ledger)
    // Crediting the venue rental subtotal payout value to host wallet
    await WalletLedger.create({
      ownerId: booking.ownerId,
      amount: subtotal,
      type: 'CREDIT',
      description: `Venue rental payout for Booking #${booking.bookingNumber}`,
      referenceId: booking._id,
    });

    // Emit Events
    paymentEvents.emit('PAYMENT_SUCCESS', payment);
    paymentEvents.emit('INVOICE_GENERATED', invoice);

    res.status(200).json({
      status: 'success',
      message: 'Payment verified and booking confirmed.',
      data: {
        payment,
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/webhook
 * Razorpay webhook handler (idempotent webhook process)
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      next(new AppError('Webhook signature headers missing.', 400));
      return;
    }

    // Verify signature
    const isValid = verifyWebhookSignature(
      JSON.stringify(req.body),
      signature,
      config.RAZORPAY_WEBHOOK_SECRET
    );
    // Note: In local dev we can log warning or bypass if keys are placeholders
    if (!isValid && config.RAZORPAY_WEBHOOK_SECRET !== 'rzp_test_placeholder_webhook_secret') {
      next(new AppError('Webhook signature validation failed.', 400));
      return;
    }

    const event = req.body.event;
    const eventId = req.body.id;

    // Idempotency check: Skip duplicate events
    if (processedWebhookEvents.has(eventId)) {
      res.status(200).json({ status: 'ok', message: 'Event already processed.' });
      return;
    }
    processedWebhookEvents.add(eventId);

    logger.info(`🔔 Webhook event received: ${event} | ID: ${eventId}`);

    // Parse event payloads
    const entity = req.body.payload.payment?.entity || req.body.payload.refund?.entity;
    if (!entity) {
      res.status(200).json({ status: 'ok', message: 'No action taken.' });
      return;
    }

    const orderId = entity.order_id;
    const paymentId = entity.id;

    if (event === 'payment.captured') {
      const payment = await Payment.findOne({ providerOrderId: orderId, status: 'PENDING' });
      if (payment) {
        payment.status = 'SUCCESS';
        payment.providerPaymentId = paymentId;
        await payment.save();

        const booking = await Booking.findById(payment.bookingId);
        if (booking && booking.bookingStatus !== 'CONFIRMED') {
          // Generate Invoice Number
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const rand = Math.floor(1000 + Math.random() * 9000);
          const invoiceNumber = `BMV-INV-${dateStr}-${rand}`;

          const invoice = await Invoice.create({
            invoiceNumber,
            bookingId: booking._id,
            paymentId: payment._id,
            customerId: booking.customerId,
            ownerId: booking.ownerId,
            subtotal: booking.subtotal,
            gst: booking.taxes,
            discount: booking.discount,
            total: booking.totalAmount,
            pdfUrl: `/api/v1/invoices/download/${invoiceNumber}.pdf`,
            status: 'PAID',
          });

          payment.invoiceId = invoice._id as Types.ObjectId;
          await payment.save();

          booking.bookingStatus = 'CONFIRMED';
          booking.paymentStatus = 'PAID';
          booking.statusHistory.push({
            status: 'CONFIRMED',
            updatedAt: new Date(),
            updatedBy: payment.customerId,
            notes: 'Confirmed asynchronously via webhook payment capture.',
          });
          await booking.save();

          await WalletLedger.create({
            ownerId: booking.ownerId,
            amount: booking.subtotal,
            type: 'CREDIT',
            description: `Venue rental payout for Booking #${booking.bookingNumber} (Webhook)`,
            referenceId: booking._id,
          });

          paymentEvents.emit('PAYMENT_SUCCESS', payment);
          paymentEvents.emit('INVOICE_GENERATED', invoice);
        }
      }
    } else if (event === 'payment.failed') {
      const payment = await Payment.findOne({ providerOrderId: orderId, status: 'PENDING' });
      if (payment) {
        payment.status = 'FAILED';
        payment.providerPaymentId = paymentId;
        await payment.save();
        paymentEvents.emit('PAYMENT_FAILED', payment);
      }
    } else if (event === 'refund.processed' || event === 'refund.created') {
      const payment = await Payment.findOne({ providerPaymentId: paymentId });
      if (payment && payment.status !== 'REFUNDED') {
        payment.status = 'REFUNDED';
        await payment.save();

        const booking = await Booking.findById(payment.bookingId);
        if (booking && booking.bookingStatus !== 'REFUNDED') {
          booking.bookingStatus = 'REFUNDED';
          booking.paymentStatus = 'REFUNDED';
          booking.statusHistory.push({
            status: 'REFUNDED',
            updatedAt: new Date(),
            updatedBy: payment.ownerId, // System/refund trigger
            notes: 'Booking refunded (Webhook).',
          });
          await booking.save();

          // Add refund debit transaction to host wallet ledger
          await WalletLedger.create({
            ownerId: booking.ownerId,
            amount: booking.subtotal,
            type: 'REFUND',
            description: `Deduction for refund of Booking #${booking.bookingNumber}`,
            referenceId: booking._id,
          });

          paymentEvents.emit('PAYMENT_REFUNDED', payment);
        }
      }
    }

    res.status(200).json({ status: 'success', eventId });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/payments/my
 * Customer: Retrieve personal payment history
 */
export const getMyPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!._id;
    const payments = await Payment.find({ customerId }).sort({ createdAt: -1 });

    const populated = await populatePaymentsMetadata(payments);

    res.status(200).json({
      status: 'success',
      data: {
        payments: populated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/payments
 * Admin: View all transactions across system
 */
export const getAdminPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    const populated = await populatePaymentsMetadata(payments);

    res.status(200).json({
      status: 'success',
      data: {
        payments: populated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payments/:id/refund
 * Admin: Refund captured transaction
 */
export const refundPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      next(new AppError('Payment transaction not found', 404));
      return;
    }

    if (payment.status !== 'SUCCESS') {
      next(new AppError('Only captured SUCCESS transactions can be refunded.', 400));
      return;
    }

    // Call Razorpay Refund API
    // Using test credentials, this triggers a test mode refund mock
    try {
      if (payment.providerPaymentId) {
        const isPlaceholder =
          config.RAZORPAY_KEY_ID.includes('placeholder') ||
          config.RAZORPAY_KEY_ID.startsWith('your-');
        if (isPlaceholder) {
          logger.info(
            `Mocking successful Razorpay refund for payment: ${payment.providerPaymentId}`
          );
        } else {
          await razorpayInstance.payments.refund(payment.providerPaymentId, {
            amount: Math.round(payment.amount * 100),
            notes: { admin_reason: 'Admin dispute arbitration refund' },
          });
        }
      }
    } catch (rzpErr) {
      logger.error('Razorpay Refund dispatch failed:', rzpErr);
      // Let it slide in test mode placeholders if needed, but in standard flow throw gateway error
      const isPlaceholder =
        config.RAZORPAY_KEY_ID.includes('placeholder') ||
        config.RAZORPAY_KEY_ID.startsWith('your-');
      if (!isPlaceholder) {
        next(new AppError('Razorpay payment refund dispatch failed.', 502));
        return;
      }
    }

    payment.status = 'REFUNDED';
    await payment.save();

    // Update booking
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.bookingStatus = 'REFUNDED';
      booking.paymentStatus = 'REFUNDED';
      booking.statusHistory.push({
        status: 'REFUNDED',
        updatedAt: new Date(),
        updatedBy: req.user!._id, // Admin User
        notes: 'Dispute refund dispatched by Admin.',
      });
      await booking.save();

      // Add Refund debit entry in host ledger (immutable ledger)
      await WalletLedger.create({
        ownerId: booking.ownerId,
        amount: booking.subtotal,
        type: 'REFUND',
        description: `Deduction for refund of Booking #${booking.bookingNumber} (Admin Override)`,
        referenceId: booking._id,
      });
    }

    paymentEvents.emit('PAYMENT_REFUNDED', payment);

    res.status(200).json({
      status: 'success',
      message: 'Dispute refund completed successfully.',
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/invoices/:id
 * Retrieve specific invoice PDF download
 */
export const getInvoicePdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params; // Can be Invoice ID or invoiceNumber

    // Find invoice by ID, invoiceNumber, or bookingId
    const invoice = await Invoice.findOne({
      $or: [
        { _id: Types.ObjectId.isValid(id) ? id : null },
        { invoiceNumber: id },
        { bookingId: Types.ObjectId.isValid(id) ? id : null },
      ],
    });

    if (!invoice) {
      next(new AppError('Invoice details not found', 404));
      return;
    }

    // Gather metadata documents
    const [booking, customer] = await Promise.all([
      Booking.findById(invoice.bookingId).lean(),
      User.findById(invoice.customerId).select('name email').lean(),
    ]);

    const targetVenue = booking ? await Venue.findById(booking.venueId).lean() : null;

    // Generate PDF stream buffer via pdfkit
    const pdfBuffer = await generateInvoicePdfBuffer(
      invoice,
      (booking || {}) as unknown as IBooking,
      (customer || {}) as unknown as IUser,
      (targetVenue || {}) as unknown as IVenue
    );

    // Send PDF stream file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/payments/wallet
 * Owner: Get wallet balance and transaction ledger history
 */
export const getWalletBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user!._id;

    // Retrieve immutable ledger entries
    const ledger = await WalletLedger.find({ ownerId }).sort({ createdAt: -1 });

    // Calculate active balance
    // CREDIT adds, REFUND/DEBIT/WITHDRAWAL deducts
    let balance = 0;
    ledger.forEach((tx) => {
      if (tx.type === 'CREDIT') {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        balance,
        ledger,
      },
    });
  } catch (error) {
    next(error);
  }
};
