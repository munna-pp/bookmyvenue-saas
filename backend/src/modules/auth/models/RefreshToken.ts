import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';
import crypto from 'crypto';

export interface IRefreshToken extends Document {
  token: string; // Hashed refresh token
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index to auto-delete documents when expiresAt is reached
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/**
 * Utility function to hash a raw refresh token using SHA-256.
 */
export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

const conn = getModuleConnection('auth');
export const RefreshToken = conn.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
