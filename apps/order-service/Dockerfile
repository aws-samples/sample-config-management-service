# Multi-stage Dockerfile for ECS - Optimized for NestJS monorepo
# Stage 1: Build dependencies and compile TypeScript
FROM --platform=linux/amd64 node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY apps/order-service/package*.json ./apps/order-service/
COPY libs/logger/package*.json ./libs/logger/
COPY libs/proto/package*.json ./libs/proto/
COPY libs/filters/package*.json ./libs/filters/
COPY libs/auth/package*.json ./libs/auth/

# Install root dependencies with legacy-peer-deps flag
RUN npm install --legacy-peer-deps

# Copy source code and configuration files
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY apps/ ./apps/
COPY libs/ ./libs/

# Install dependencies for libraries and app
RUN npm run install:logger && \
    npm run install:proto && \
    npm run install:filters && \
    npm run install:auth && \
    cd apps/order-service && npm install

# Build libraries and application
RUN npm run build:logger && \
    npm run build:proto && \
    npm run build:filters && \
    npm run build:auth && \
    npm run build order-service

# Stage 2: Production runtime image
FROM --platform=linux/amd64 node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy node_modules from builder (includes all runtime dependencies)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy proto files - gRPC needs them at runtime
COPY --from=builder --chown=nestjs:nodejs /app/libs/proto/src/config-service ./libs/proto/src/config-service

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3001

# Health check for ECS
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/apps/order-service/main.js"]