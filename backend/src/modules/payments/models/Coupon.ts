import { Schema, Document } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface ICoupon extends Document {
  code: string;
  type: 'PERCENTAGE' | 'FLAT';
  discount: number;
  minimumBookingAmount: number;
  maximumDiscount?: number;
  usageLimit: number;
  usageCount: number;
  perUserLimit: number;
  userUsage: Map<string, number>;
  expiryDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumBookingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDiscount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    userUsage: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ code: 1 }, { unique: true });

const conn = getModuleConnection('payments');
export const Coupon = conn.model<ICoupon>('Coupon', couponSchema);
