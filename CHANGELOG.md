# Changelog

All notable changes to the BookMyVenue booking monolith will be documented in this file.

## [0.7.0] - 2026-06-30

### Added

- Advanced Search engine with full-text keyword queries, capacity limits, price ranges, rating minimums, amenities checks, and availability dates.
- Geospatial radial nearby queries matching coordinate ranges (1km to 100km) utilizing MongoDB `2dsphere` indexes.
- Debounced instant autocomplete suggestion drop-downs grouping venue titles, matching cities, and types.
- Personalized recommendation engine aggregating customer search history log counts, wishlists, and bookings.
- Search Analytics compiling total logs, popular keywords, cities, venue types, and zero-result queries.
- Next.js 15 split screen layouts dynamically integrating Leaflet OpenStreetMap markers, circular radius ranges, custom popup pins, list toggles, and skeletons.
- Single venue location maps rendering directions links to Google Maps coordinates.
- E2E search integration validation script.

## [0.6.0] - 2026-06-29

### Added

- Complete Reviews & Ratings system including automated star rating recalculations.
- Dedicated MongoDB Review and Wishlist collections with isolated connection pools.
- Verified Purchase verification restricting review submissions to completed booking references.
- Host replies workflow enabling owners to respond to reviews.
- Admin review moderation dashboard supporting hiding, restoring, and permanently purging reviews.
- Interactive customer stars feedback forms and image upload/links attachments.
- Paginated customer Wishlist portal supporting multiple sorting choices (price, rating, date saved).
- E2E reviews and wishlist integration test suite.

## [0.5.0] - 2026-06-28

### Added

- Multi-channel notification engine (realtime Socket.IO and responsive Nodemailer HTML/text emails).
- Centralized event dispatcher enabling loose coupling between domain modules (Auth, Venues, Bookings, Payments) and notification logic.
- Dedicated MongoDB Notification collection with isolated connection and soft delete capabilities.
- Paginated customer Notification Center panel with read/unread toggle and delete actions.
- Realtime notification bells integrated into Customer, Owner, and Admin headers.
- E2E notifications integration test suite.

## [0.4.0] - 2026-06-27

### Added

- Complete Razorpay secure payments module sandbox integration.
- Dynamic Coupon validation engine supporting flat/percentage discounts, usage caps, and per-user limits.
- On-the-fly PDF invoice compiler utilizing `pdfkit` for GST breakdowns and custom layouts.
- Host wallet transaction ledgers for double-entry payouts audit tracing.
- Front-end dashboards for Secure Checkout, Success/Failed states, Host Wallets, and Admin Dispute Refunds.
- E2E E2E payments validation test suite script.

## [0.3.0] - 2026-06-25

### Added

- Complete Booking Engine supporting event slots scheduling, Guest bounds checking, and automated taxes/deposits calculations.
- Compound indexing for booking queries.
- Booking status transition state machine.

## [0.2.0] - 2026-06-20

### Added

- Complete Venue Management module featuring CRUD listings, status publication, GeoJSON coordinate indexing, and amenities managers.

## [0.1.0] - 2026-06-15

### Added

- Modular monolith base system, Docker Compose integrations (MongoDB, Redis, Promtail, Loki, Prometheus, Grafana).
- Centralized JWT User Authentication module (bcrypt password hashing, token rotators).
