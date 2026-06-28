# BookMyVenue SaaS Platform

BookMyVenue is a premium venue booking SaaS platform designed for booking wedding halls, convention centers, banquet halls, resorts, and meeting spaces.

This project is structured as a **Modular Monolith** in an **npm workspaces monorepo** configuration, making it ready for future microservices migration.

---

## Repository Structure

```text
booking-saas/ (bookmyvenue-saas root)
├── apps/
│   ├── web/          # Next.js 15 Customer Application (Port 3000)
│   ├── admin/        # Next.js 15 Admin Dashboard (Port 3001, basePath: /admin)
│   └── owner/        # Next.js 15 Host/Owner Dashboard (Port 3002, basePath: /owner)
├── backend/          # Express + TypeScript Monolith Application (Port 5000)
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/   # Environment and DB config managers
│   │   └── modules/  # Modular monolith business features
│   │       ├── auth, users, venues, bookings, payments, notifications, reviews, search
├── packages/
│   └── shared-types/ # Shared TypeScript types and interfaces
├── infrastructure/
│   ├── nginx/        # Reverse Proxy / HMR Gateway (Port 80)
│   └── monitoring/   # Prometheus, Grafana, Loki, Promtail configurations
├── docs/             # Technical specifications & API docs
└── docker-compose.yml
```

---

## Getting Started (Docker Compose)

The entire development stack runs locally with hot-reloading enabled.

### Prerequisites

- Docker & Docker Compose
- Node.js v20+ (optional, for running tools locally)

### Steps

1. **Verify Environment Configuration**
   Confirm that the `.env` file exists at the root. The initialization has pre-configured defaults:

   ```bash
   cp .env.example .env
   ```

2. **Launch Services**
   Run the following command at the root to build and boot all containers:

   ```bash
   docker compose up --build
   ```

3. **Available Application Ports**
   Once started, all frontend apps and backend APIs are unified under the **Nginx Proxy** on Port 80:
   - **Customer Web App**: [http://localhost/](http://localhost/)
   - **Owner Portal**: [http://localhost/owner](http://localhost/owner)
   - **Admin Dashboard**: [http://localhost/admin](http://localhost/admin)
   - **Backend API Gateway**: [http://localhost/api/v1](http://localhost/api/v1)

   **Direct container ports (for debugging/development bypass):**
   - Web App: [http://localhost:3000](http://localhost:3000)
   - Admin App: [http://localhost:3001/admin](http://localhost:3001/admin)
   - Owner App: [http://localhost:3002/owner](http://localhost:3002/owner)
   - Express Backend: [http://localhost:5000](http://localhost:5000)
   - MongoDB: `mongodb://localhost:27017`
   - Redis: `redis://localhost:6379`

4. **Monitoring Stack**
   - **Grafana**: [http://localhost:3003](http://localhost:3003) (Default credentials: `admin` / `admin`)
   - **Prometheus**: [http://localhost:9090](http://localhost:9090)

---

## Verifying Services & Health Check APIs

### 1. Unified Gateway API Health Check

Returns details of the Monolith engine:

```bash
curl http://localhost/health
# Returns: { "status": "ok", "service": "bookmyvenue-backend", "uptime": ... }
```

### 2. Module Boundaries Verification

Each modular monolith subsystem has its own health check endpoint to prove isolated route resolving:

- **Auth**: [http://localhost/api/v1/auth/health](http://localhost/api/v1/auth/health)
- **Users**: [http://localhost/api/v1/users/health](http://localhost/api/v1/users/health)
- **Venues**: [http://localhost/api/v1/venues/health](http://localhost/api/v1/venues/health)
- **Bookings**: [http://localhost/api/v1/bookings/health](http://localhost/api/v1/bookings/health)
- **Payments**: [http://localhost/api/v1/payments/health](http://localhost/api/v1/payments/health)
- **Notifications**: [http://localhost/api/v1/notifications/health](http://localhost/api/v1/notifications/health)
- **Reviews**: [http://localhost/api/v1/reviews/health](http://localhost/api/v1/reviews/health)
- **Search**: [http://localhost/api/v1/search/health](http://localhost/api/v1/search/health)

---

## Local Development Commands (Without Docker)

To run linting or code formatting locally:

```bash
# Install root modules
npm install --legacy-peer-deps

# Lint entire project
npm run lint

# Format code
npm run format

# Run specific app in development mode
npm run dev:web
npm run dev:backend
```

---

## E2E Payments Integration Tests

To run E2E integration test verification for payments, coupons, invoices, and ledgers in test mode:

```bash
# Run verification script against the active local Express container
node backend/src/config/verify_payments.js
```

---

## E2E Notifications Integration Tests

To run E2E integration test verification for real-time notifications, event-driven emails (Nodemailer SMTP), and CRUD APIs:

```bash
# Run verification script against the active local Express container
node backend/src/config/verify_notifications.js
```
