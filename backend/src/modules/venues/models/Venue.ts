import { Schema, Document, Types, Model } from 'mongoose';
import { getModuleConnection } from '../../../config/db.js';

export interface IVenue extends Document {
  ownerId: Types.ObjectId;
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
    start: Date;
    end: Date;
    reason: string;
  }[];
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  publicationStatus: 'DRAFT' | 'PUBLISHED';
  rating: number;
  reviewCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const venueSchema = new Schema<IVenue>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      ref: 'User',
    },
    slug: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Venue title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Venue description is required'],
    },
    venueType: {
      type: String,
      required: [true, 'Venue type is required'],
      enum: [
        'wedding_hall',
        'convention_center',
        'banquet_hall',
        'birthday_venue',
        'resort',
        'meeting_room',
        'sports_ground',
        'farm_house',
        'event_space',
      ],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1 person'],
    },
    pricing: {
      pricePerDay: { type: Number, required: true, min: 0 },
      pricePerHalfDay: { type: Number, min: 0 },
      pricePerHour: { type: Number, min: 0 },
      securityDeposit: { type: Number, min: 0 },
      cleaningFee: { type: Number, min: 0 },
    },
    amenities: {
      type: [String],
      default: [],
    },
    policies: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    featuredImage: {
      type: String,
    },
    availability: [
      {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        reason: { type: String, required: true },
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
    },
    publicationStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Slugify Helper Function
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Generate unique SEO-friendly slugs before validation
venueSchema.pre('validate', async function (next) {
  if (this.isModified('title') || !this.slug) {
    const baseSlug = slugify(this.title || 'venue');
    let uniqueSlug = baseSlug;
    let counter = 0;
    let slugExists = true;

    // Access the Venue model from the document context
    const VenueModel = this.constructor as Model<IVenue>;

    while (slugExists) {
      const query: Record<string, unknown> = { slug: uniqueSlug, isDeleted: false };
      if (this._id) {
        query._id = { $ne: this._id };
      }

      const existing = await VenueModel.findOne(query);
      if (!existing) {
        slugExists = false;
      } else {
        counter++;
        uniqueSlug = `${baseSlug}-${counter}`;
      }
    }
    this.slug = uniqueSlug;
  }
  next();
});

// Setup Mongoose indexes
venueSchema.index({ slug: 1 }, { unique: true });
venueSchema.index({ ownerId: 1 });
venueSchema.index({ approvalStatus: 1 });
venueSchema.index({ publicationStatus: 1 });
venueSchema.index({ venueType: 1 });
venueSchema.index({ city: 1 });
venueSchema.index({ 'pricing.pricePerDay': 1 });
venueSchema.index({ rating: -1 });
venueSchema.index({ location: '2dsphere' });

const conn = getModuleConnection('venues');
export const Venue = conn.model<IVenue>('Venue', venueSchema);
