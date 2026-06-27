# Express backend application Dockerfile (Optimized Workspaces Build)
FROM node:20-alpine AS base
WORKDIR /app

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

# Build the backend application
RUN npm run build --workspace=@bookmyvenue/shared-types && npm run build:backend

# Runner Stage: Run the built Express application
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy all files from builder (retains full workspace structure and build output)
COPY --from=builder /app ./

EXPOSE 5000
ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start", "--workspace=backend"]
