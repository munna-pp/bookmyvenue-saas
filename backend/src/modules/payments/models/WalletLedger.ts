import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface IWalletLedger extends Document {
  ownerId: Types.ObjectId;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'WITHDRAWAL';
  description: string;
  referenceId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const walletLedgerSchema = new Schema<IWalletLedger>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'REFUND', 'WITHDRAWAL'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
  },
  {
    timestamps: true,
  }
);

walletLedgerSchema.index({ ownerId: 1 });

const conn = getModuleConnection('payments');
export const WalletLedger = conn.model<IWalletLedger>('WalletLedger', walletLedgerSchema);
