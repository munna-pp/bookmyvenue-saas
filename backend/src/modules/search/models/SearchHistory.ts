import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface ISearchHistory extends Document {
  customerId?: Types.ObjectId;
  keyword?: string;
  filters: Record<string, any>;
  searchedAt: Date;
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    keyword: {
      type: String,
      trim: true,
      required: false,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    searchedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for analytics
searchHistorySchema.index({ customerId: 1 });
searchHistorySchema.index({ keyword: 1 });
searchHistorySchema.index({ searchedAt: -1 });

const conn = getModuleConnection('search');
export const SearchHistory = conn.model<ISearchHistory>('SearchHistory', searchHistorySchema);
