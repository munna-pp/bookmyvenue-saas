# Changelog

All notable changes to the BookMyVenue booking monolith will be documented in this file.

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
