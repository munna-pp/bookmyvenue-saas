import { Schema, Document } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface INotification extends Document {
  userId: Schema.Types.ObjectId;
  title: string;
  message: string;
  type: 'INFO' | 'BOOKING_ALERT' | 'PAYMENT_ALERT' | 'VENUE_ALERT' | 'ADMIN_ALERT';
  read: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['INFO', 'BOOKING_ALERT', 'PAYMENT_ALERT', 'VENUE_ALERT', 'ADMIN_ALERT'],
      default: 'INFO',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user notifications quickly
notificationSchema.index({ userId: 1, isDeleted: 1, read: 1 });

const conn = getModuleConnection('notifications');
export const Notification = conn.model<INotification>('Notification', notificationSchema);
