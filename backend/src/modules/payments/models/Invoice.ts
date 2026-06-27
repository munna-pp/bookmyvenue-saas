import { Schema, Document, Types } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface IInvoice extends Document {
  invoiceNumber: string;
  bookingId: Types.ObjectId;
  paymentId?: Types.ObjectId;
  customerId: Types.ObjectId;
  ownerId: Types.ObjectId;
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  pdfUrl?: string;
  status: 'UNPAID' | 'PAID' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Booking',
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gst: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    pdfUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'CANCELLED'],
      default: 'UNPAID',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ bookingId: 1 });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ ownerId: 1 });

const conn = getModuleConnection('payments');
export const Invoice = conn.model<IInvoice>('Invoice', invoiceSchema);
