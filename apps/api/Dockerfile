# Multi-stage Dockerfile for apps/api
# - Builder stage installs deps and builds the app
# - Production stage contains only runtime artifacts

FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install build-time dependencies
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy the app source and build (if a build script exists)
COPY . .
RUN if npm run | grep -q " build"; then npm run build; else echo "no build script found, skipping"; fi

FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy package metadata and production deps from builder
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy build output (common is `dist`) and any runtime files
COPY --from=builder /usr/src/app .

# Create a non-root user for improved security
RUN addgroup -S app && adduser -S app -G app
USER app

# Replace `4000` with your API port if different
EXPOSE 4000

# Basic healthcheck (expects a `/health` endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD wget -q --spider http://localhost:4000/health || exit 1

# Use the production start script; ensure `start` exists in package.json
CMD ["npm", "run", "start"]
