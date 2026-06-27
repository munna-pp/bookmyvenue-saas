# Manual Verification Guide - Venue Management (Phase 3)

This guide details how to manually verify the features of Phase 3 (Venue Management) across Customer, Owner, and Admin dashboards.

## Credentials

Use the following seeded accounts during testing:

- **System Administrator**:
  - Email: `admin@bookmyvenue.com`
  - Password: `adminpassword`
- **Venue Owner**:
  - Email: `owner@bookmyvenue.com`
  - Password: `ownerpassword`

---

## 1. Customer Browse & Details

### Accessing via Port 80 (Nginx Gateway)

- Visit: `http://localhost/venues`
  - Confirms listing page loads and queries the backend.
  - Test searching: Type in search bar (e.g. "Beach", "Palace") -> lists matching venues.
  - Test filtering: Click different amenities (e.g. "WiFi", "Outdoor Lawn") -> refilters lists.
- Click any venue card to navigate to details:
  - Visit: `http://localhost/venues/<venue-slug>`
  - Confirms details load, including images, capacity, pricing details, amenities list, and rules policies.
  - Try using the booking card to submit a booking date request -> verifies mock success alert displays.

---

## 2. Owner Dashboard & Venue Creation

### Accessing via Port 3002 (Direct Dev) or Port 80

- Visit: `http://localhost/owner/login`
- Log in using `owner@bookmyvenue.com` / `ownerpassword`.
- Redirects to: `http://localhost/owner/venues` (My Listed Venues Dashboard).
  - Verifies that statistics (Total, Approved, Pending) matches current database counts.
  - Lists owner's active properties.
- Click **"Create New Venue"**:
  - Visit: `http://localhost/owner/venues/new`
  - Test validation: Click submit without values -> checks Zod error highlight markers.
  - Fill out inputs (title, category, type, address, capacity, pricing, coordinates).
  - Test drag-and-drop: Drag 1-2 images into drop zone -> verifies previews render.
  - Add 2-3 policies and select amenities.
  - Select **"Publish Listing"** and click **"Save Listing Details"**.
  - Verifies redirect to list page and check that the new listing is in `PENDING` state.

---

## 3. Admin Queue & Approval Audit

### Accessing via Port 3001 (Direct Dev) or Port 80

- Visit: `http://localhost/admin/login`
- Log in using `admin@bookmyvenue.com` / `adminpassword`.
- Redirects to: `http://localhost/admin/venues` (Approval Queue Dashboard).
  - Verifies the queue lists the newly created owner venue (in `PENDING` status).
  - Click **"Approve"** (Green Check Icon) on the venue row.
  - Verifies the status updates to `APPROVED` dynamically.
- Visit `http://localhost/venues` again:
  - Verifies the approved venue is now visible to the public guest browsing lists!
