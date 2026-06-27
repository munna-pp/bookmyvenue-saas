export type UserRole = 'customer' | 'owner' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  description: string;
  venueType:
    | 'wedding_hall'
    | 'convention_center'
    | 'banquet_hall'
    | 'birthday_venue'
    | 'resort'
    | 'meeting_room'
    | 'sports_ground'
    | 'farm_house'
    | 'event_space';
  category: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  city: string;
  state: string;
  country: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  capacity: number;
  pricing: {
    pricePerDay: number;
    pricePerHalfDay?: number;
    pricePerHour?: number;
    securityDeposit?: number;
    cleaningFee?: number;
  };
  amenities: string[];
  policies: string[];
  images: string[];
  featuredImage?: string;
  availability: {
    start: string;
    end: string;
    reason: string;
  }[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  publicationStatus: 'DRAFT' | 'PUBLISHED';
  rating: number;
  reviewCount: number;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  ownerId: string;
  venueId: string;
  eventType: string;
  eventDate: string;
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
  bookingStatus:
    | 'PENDING'
    | 'OWNER_APPROVED'
    | 'OWNER_REJECTED'
    | 'PAYMENT_PENDING'
    | 'PAID'
    | 'CONFIRMED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  statusHistory: {
    status: string;
    updatedAt: string;
    updatedBy: string;
    notes?: string;
  }[];
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  refundEligible?: boolean;
  refundPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  ownerId: string;
  amount: number;
  currency: string;
  provider: 'razorpay';
  providerOrderId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  status: PaymentStatus;
  couponId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  paymentId?: string;
  customerId: string;
  ownerId: string;
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  pdfUrl?: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export type CouponType = 'PERCENTAGE' | 'FLAT';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  discount: number;
  minimumBookingAmount: number;
  maximumDiscount?: number;
  usageLimit: number;
  perUserLimit: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'WITHDRAWAL';

export interface WalletLedger {
  id: string;
  ownerId: string;
  amount: number;
  type: WalletTransactionType;
  description: string;
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
}
