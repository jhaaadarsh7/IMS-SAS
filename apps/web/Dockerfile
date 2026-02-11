# Multi-stage Dockerfile for apps/web (Next.js)

FROM node:20-alpine AS builder
WORKDIR /usr/src/app

ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN if npm run | grep -q " build"; then npm run build; else echo "no build script found, skipping"; fi

FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app .

RUN addgroup -S app && adduser -S app -G app
USER app

# Default Next.js port
EXPOSE 3000

# Start the Next production server. Ensure `start` is defined in package.json
CMD ["npm", "run", "start"]
