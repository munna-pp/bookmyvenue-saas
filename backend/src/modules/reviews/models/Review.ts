import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface IReview extends Document {
  bookingId: Types.ObjectId;
  venueId: Types.ObjectId;
  customerId: Types.ObjectId;
  rating: number;
  title: string;
  review: string;
  images: string[];
  ownerReply?: {
    reply: string;
    repliedAt: Date;
  };
  isVerifiedPurchase: boolean;
  isDeleted: boolean;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Booking ID is required'],
      index: true,
    },
    venueId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Venue ID is required'],
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Customer ID is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    title: {
      type: String,
      required: [true, 'Review title is required'],
      trim: true,
    },
    review: {
      type: String,
      required: [true, 'Review body is required'],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    ownerReply: {
      reply: { type: String, trim: true },
      repliedAt: { type: Date },
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add index on venueId + rating and customerId + venueId
reviewSchema.index({ venueId: 1, isDeleted: 1, hidden: 1 });
reviewSchema.index({ customerId: 1, isDeleted: 1 });

const conn = getModuleConnection('reviews');
export const Review = conn.model<IReview>('Review', reviewSchema);
