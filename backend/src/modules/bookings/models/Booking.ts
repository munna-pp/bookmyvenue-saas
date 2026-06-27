import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface IBooking extends Document {
  bookingNumber: string;
  customerId: Types.ObjectId;
  ownerId: Types.ObjectId;
  venueId: Types.ObjectId;
  eventType: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequests?: string;
  pricingSnapshot: {
    pricePerDay: number;
    pricePerHalfDay?: number;
    pricePerHour?: number;
    securityDeposit?: number;
    cleaningFee?: number;
  };
  subtotal: number;
  taxes: number;
  discount: number;
  totalAmount: number;
  bookingStatus: 'PENDING' | 'OWNER_APPROVED' | 'OWNER_REJECTED' | 'PAYMENT_PENDING' | 'PAID' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  statusHistory: {
    status: string;
    updatedAt: Date;
    updatedBy: Types.ObjectId;
    notes?: string;
  }[];
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  refundEligible?: boolean;
  refundPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      unique: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Customer ID is required'],
      ref: 'User',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      ref: 'User',
    },
    venueId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Venue ID is required'],
      ref: 'Venue',
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true,
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    guestCount: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Guest count must be at least 1 person'],
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    pricingSnapshot: {
      pricePerDay: { type: Number, required: true, min: 0 },
      pricePerHalfDay: { type: Number, min: 0 },
      pricePerHour: { type: Number, min: 0 },
      securityDeposit: { type: Number, min: 0 },
      cleaningFee: { type: Number, min: 0 },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxes: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    bookingStatus: {
      type: String,
      enum: [
        'PENDING',
        'OWNER_APPROVED',
        'OWNER_REJECTED',
        'PAYMENT_PENDING',
        'PAID',
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED',
        'REFUNDED',
      ],
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED'],
      default: 'PENDING',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, required: true },
        notes: { type: String },
      },
    ],
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
    },
    refundEligible: {
      type: Boolean,
      default: false,
    },
    refundPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Unique bookingNumber generation hook
bookingSchema.pre('validate', function (next) {
  if (!this.bookingNumber) {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(100000 + Math.random() * 900000); // 6-digit random code
    this.bookingNumber = `BMV-${datePart}-${randomPart}`;
  }
  next();
});

// Setup indexes
bookingSchema.index({ bookingNumber: 1 }, { unique: true });
bookingSchema.index({ venueId: 1, eventDate: 1 });
bookingSchema.index({ venueId: 1, bookingStatus: 1 });
bookingSchema.index({ ownerId: 1, bookingStatus: 1 });
bookingSchema.index({ customerId: 1, bookingStatus: 1 });

const conn = getModuleConnection('bookings');
export const Booking = conn.model<IBooking>('Booking', bookingSchema);
