import { Router } from 'express';
import {
  applyCoupon,
  createOrder,
  verifyPayment,
  handleWebhook,
  getMyPayments,
  getAdminPayments,
  refundPayment,
  getInvoicePdf,
  getWalletBalance,
} from './controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { applyCouponSchema, createOrderSchema, verifyPaymentSchema } from './dtos.js';

const router = Router();

// Coupons endpoints
router.post('/coupons/apply', protect, restrictTo('customer'), validate(applyCouponSchema), applyCoupon);

// Webhook endpoint (Public, verified internally)
router.post('/payments/webhook', handleWebhook);

// Payments endpoints
router.post('/payments/create-order', protect, restrictTo('customer'), validate(createOrderSchema), createOrder);
router.post('/payments/verify', protect, restrictTo('customer'), validate(verifyPaymentSchema), verifyPayment);
router.get('/payments/my', protect, restrictTo('customer'), getMyPayments);
router.get('/payments/wallet', protect, restrictTo('owner'), getWalletBalance);

// Admin payments & dispute endpoints
router.get('/admin/payments', protect, restrictTo('admin'), getAdminPayments);
router.post('/payments/:id/refund', protect, restrictTo('admin'), refundPayment);

// Invoice PDF downloads endpoint
router.get('/invoices/download/:id', protect, getInvoicePdf);

export default router;
