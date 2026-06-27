# Next.js admin application Dockerfile (Optimized Workspaces Build)
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies needed for some native builds
RUN apk add --no-cache libc6-compat

# Builder Stage: Install dependencies AND build the app to preserve monorepo symlinks
FROM base AS builder
# Copy package definitions for caching dependencies layer
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/web/package*.json ./apps/web/
COPY apps/admin/package*.json ./apps/admin/
COPY apps/owner/package*.json ./apps/owner/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the admin application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=@bookmyvenue/shared-types && npm run build:admin

# Runner Stage: Run the built Next.js application
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy all files from builder (retains full workspace structure and build output)
COPY --from=builder /app ./

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start", "--workspace=apps/admin"]
