import { User } from '../modules/auth/models/User.js';
import { Venue } from '../modules/venues/models/Venue.js';
import { Booking } from '../modules/bookings/models/Booking.js';
import { Coupon } from '../modules/payments/models/Coupon.js';
import { logger } from '../utils/logger.js';

/**
 * Seed default accounts, venues, and bookings for local development/testing
 */
export const seedAdmin = async (): Promise<void> => {
  try {
    // 1. Seed System Admin
    const adminEmail = 'admin@bookmyvenue.com';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      logger.info('👤 No admin user detected. Seeding default system administrator...');
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: 'adminpassword',
        role: 'admin',
        status: 'ACTIVE',
        isVerified: true,
      });
      logger.info('✅ Default system administrator seeded successfully.');
    }

    // 2. Seed Default Owner
    const ownerEmail = 'owner@bookmyvenue.com';
    let owner = await User.findOne({ email: ownerEmail });

    if (!owner) {
      logger.info('👤 No owner user detected. Seeding default venue owner...');
      owner = await User.create({
        name: 'Ramesh Palace Holdings',
        email: ownerEmail,
        password: 'ownerpassword',
        role: 'owner',
        status: 'ACTIVE',
        isVerified: true,
      });
      logger.info('✅ Default venue owner seeded successfully.');
    }

    // 3. Seed Default Customer
    const customerEmail = 'customer@bookmyvenue.com';
    let customer = await User.findOne({ email: customerEmail });

    if (!customer) {
      logger.info('👤 No customer user detected. Seeding default customer...');
      customer = await User.create({
        name: 'Jane Customer',
        email: customerEmail,
        password: 'customerpassword',
        role: 'customer',
        status: 'ACTIVE',
        isVerified: true,
      });
      logger.info('✅ Default customer seeded successfully.');
    }

    // 4. Seed Venues
    let grandPalace = await Venue.findOne({
      title: 'Grand Palace Ballroom & Gardens',
      isDeleted: false,
    });

    const venuesCount = await Venue.countDocuments({ isDeleted: false });
    if (venuesCount === 0) {
      logger.info('🏛️ No venues detected. Seeding sample venue data...');

      const sampleVenues = [
        {
          ownerId: owner._id,
          title: 'Grand Palace Ballroom & Gardens',
          description:
            'A luxurious and expansive ballroom perfect for weddings, banquets, and grand receptions. Features elegant crystal chandeliers, professional sound systems, and a beautiful outdoor lawn.',
          venueType: 'wedding_hall',
          category: 'Luxury Wedding Spaces',
          address: {
            street: '102 Palace Road, Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400050',
            country: 'India',
          },
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          location: {
            type: 'Point',
            coordinates: [72.8258, 19.0596], // [longitude, latitude]
          },
          capacity: 1200,
          pricing: {
            pricePerDay: 150000,
            pricePerHalfDay: 85000,
            securityDeposit: 50000,
            cleaningFee: 10000,
          },
          amenities: [
            'Air Conditioning',
            'Valet Parking',
            'Catering Kitchen',
            'AV Equipment',
            'WiFi',
            'Bridal Suite',
            'Outdoor Lawn',
          ],
          policies: [
            'No loud music after 10 PM',
            'External caterers allowed',
            '100% refund up to 30 days before event',
          ],
          images: [
            'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
          ],
          featuredImage:
            'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
          approvalStatus: 'APPROVED',
          publicationStatus: 'PUBLISHED',
          rating: 4.9,
          reviewCount: 24,
        },
        {
          ownerId: owner._id,
          title: 'Skyline Executive Hub & Suites',
          description:
            'A modern, high-tech meeting room and corporate event space in the heart of Bangalore. Ideal for board meetings, seminars, and networking events.',
          venueType: 'meeting_room',
          category: 'Corporate Meeting Spaces',
          address: {
            street: 'Block C, Tech Park East, Whitefield',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560066',
            country: 'India',
          },
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          location: {
            type: 'Point',
            coordinates: [77.7499, 12.9698],
          },
          capacity: 45,
          pricing: {
            pricePerDay: 25000,
            pricePerHour: 3500,
            securityDeposit: 10000,
          },
          amenities: [
            'WiFi',
            'Projector',
            'Whiteboard',
            'Air Conditioning',
            'Video Conferencing',
            'Coffee Machine',
          ],
          policies: [
            'Corporate events only',
            'No smoking',
            'Cancellations allowed up to 7 days before event',
          ],
          images: [
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=1200&q=80',
          ],
          featuredImage:
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
          approvalStatus: 'APPROVED',
          publicationStatus: 'PUBLISHED',
          rating: 4.7,
          reviewCount: 15,
        },
        {
          ownerId: owner._id,
          title: 'Whispering Palms Beach Resort',
          description:
            'Stunning beachfront resort space in Goa. Features beautiful pool decks, open lawns, and coconut groves, making it a dream venue for destination weddings and beach parties.',
          venueType: 'resort',
          category: 'Outdoor Beach Venues',
          address: {
            street: 'Calangute Beach Road',
            city: 'Goa',
            state: 'Goa',
            zipCode: '403516',
            country: 'India',
          },
          city: 'Goa',
          state: 'Goa',
          country: 'India',
          location: {
            type: 'Point',
            coordinates: [73.7626, 15.5494],
          },
          capacity: 400,
          pricing: {
            pricePerDay: 120000,
            pricePerHalfDay: 70000,
            securityDeposit: 40000,
            cleaningFee: 8000,
          },
          amenities: [
            'Outdoor Lawn',
            'Swimming Pool',
            'Beach Access',
            'Catering Kitchen',
            'WiFi',
            'Parking',
            'Bar Setup',
          ],
          policies: [
            'Event ends by midnight',
            'No fireworks',
            '50% refund up to 14 days before event',
          ],
          images: [
            'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
          ],
          featuredImage:
            'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
          approvalStatus: 'APPROVED',
          publicationStatus: 'PUBLISHED',
          rating: 4.85,
          reviewCount: 32,
        },
      ];

      await Venue.insertMany(sampleVenues);
      grandPalace = await Venue.findOne({ isDeleted: false });
      logger.info('✅ Sample venues seeded successfully.');
    } else if (!grandPalace) {
      grandPalace = await Venue.findOne({ isDeleted: false });
    }

    // 5. Seed Bookings
    const bookingsCount = await Booking.countDocuments();
    if (bookingsCount === 0 && grandPalace) {
      logger.info('📅 No bookings detected. Seeding sample booking request...');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      futureDate.setUTCHours(0, 0, 0, 0);

      const snap = {
        pricePerDay: grandPalace.pricing.pricePerDay,
        cleaningFee: grandPalace.pricing.cleaningFee || 0,
        securityDeposit: grandPalace.pricing.securityDeposit || 0,
      };

      const subtotal = snap.pricePerDay;
      const taxes = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + taxes + snap.cleaningFee + snap.securityDeposit;

      await Booking.create({
        customerId: customer._id,
        ownerId: owner._id,
        venueId: grandPalace._id,
        eventType: 'wedding',
        eventDate: futureDate,
        startTime: '10:00',
        endTime: '18:00',
        guestCount: 250,
        specialRequests: 'Need access to lawn 2 hours prior for setup.',
        pricingSnapshot: snap,
        subtotal,
        taxes,
        discount: 0,
        totalAmount,
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            updatedAt: new Date(),
            updatedBy: customer._id,
            notes: 'Initial sample reservation seeded.',
          },
        ],
      });
      logger.info('✅ Sample booking requested seeded successfully.');
    }

    // 6. Seed Coupons
    const couponsCount = await Coupon.countDocuments();
    if (couponsCount === 0) {
      logger.info('🎟️ No coupons detected. Seeding default coupons...');
      await Coupon.create([
        {
          code: 'WELCOME20',
          type: 'PERCENTAGE',
          discount: 20,
          minimumBookingAmount: 10000,
          maximumDiscount: 10000,
          usageLimit: 100,
          perUserLimit: 2,
          expiryDate: new Date(Date.now() + 30 * 86400000), // 30 days in future
          isActive: true,
        },
        {
          code: 'FLAT5000',
          type: 'FLAT',
          discount: 5000,
          minimumBookingAmount: 20000,
          usageLimit: 50,
          perUserLimit: 1,
          expiryDate: new Date(Date.now() + 15 * 86400000), // 15 days in future
          isActive: true,
        },
      ]);
      logger.info('✅ Default coupons seeded successfully.');
    }
  } catch (error) {
    logger.error('❌ Failed to seed database:', error);
  }
};
