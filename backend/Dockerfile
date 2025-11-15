# ====================================
# Multi-stage Dockerfile for Node.js Backend
# ====================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma (Alpine Linux)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev dependencies for Prisma generation)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

# ====================================
# Stage 2: Production stage
FROM node:20-alpine

# Install dumb-init and OpenSSL for Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Install Prisma CLI for migrations (needed for prisma migrate deploy)
RUN npm install -g prisma@5.7.0

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy application source
COPY --chown=nodejs:nodejs . .

# Copy and set permissions for startup script
COPY --chown=nodejs:nodejs scripts/start.sh /app/scripts/start.sh
RUN chmod +x /app/scripts/start.sh

# Create uploads directory structure with proper permissions
RUN mkdir -p uploads/images uploads/temp && \
    chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with migration and seed
CMD ["/app/scripts/start.sh"]
