# Backend Dockerfile - Multi-stage production build for TrackHub Express.js server
# Stage 1: Build dependencies and compile TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for TypeScript compilation)
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine

# Set environment to production
ENV NODE_ENV=production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy compiled application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose backend port (default 5000)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application - run compiled JavaScript from dist directory
CMD ["node", "dist/server.js"]
