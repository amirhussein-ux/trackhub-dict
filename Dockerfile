# Frontend Dockerfile - Multi-stage build for TrackHub Vite + React application
# Stage 1: Build the React application with Vite
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./

# Copy public assets if exist
COPY public ./public 2>/dev/null || true

# Copy source code
COPY src ./src

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

# Stage 2: Production-ready nginx server
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx || true

# Change ownership of nginx directory
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port for frontend
EXPOSE 80

# Health check for nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
