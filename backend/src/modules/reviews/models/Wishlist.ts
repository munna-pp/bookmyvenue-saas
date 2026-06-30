import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface IWishlist extends Document {
  customerId: Types.ObjectId;
  venueId: Types.ObjectId;
  createdAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Customer ID is required'],
      index: true,
    },
    venueId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Venue ID is required'],
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Unique compound index preventing duplicates
wishlistSchema.index({ customerId: 1, venueId: 1 }, { unique: true });

const conn = getModuleConnection('wishlist');
export const Wishlist = conn.model<IWishlist>('Wishlist', wishlistSchema);
