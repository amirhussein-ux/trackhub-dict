# TrackHub Docker Setup Guide

## Overview

This guide explains how to run TrackHub using Docker and Docker Compose. The entire application stack (Frontend, Backend, MongoDB) runs in containerized services with proper networking and persistent storage.

## Prerequisites

1. **Docker** (v20.10+) - [Install Docker](https://docs.docker.com/get-docker/)
2. **Docker Compose** (v2.0+) - Usually installed with Docker Desktop
3. **Git** - To clone/manage the repository

Verify installation:
```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone and Setup

```bash
cd trackhub-dict
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file and update critical values:

```bash
# Backend secrets - CHANGE THESE FOR PRODUCTION
MONGODB_PASSWORD=your_secure_password_here
AUTH_SESSION_SECRET=your_32_plus_character_random_secret_here
SEED_ADMIN_PASSWORD=AdminPassword123!
SEED_DIVISION_CHIEF_PASSWORD=ChiefPassword123!
SEED_DIVISION_MEMBER_PASSWORD=MemberPassword123!
```

**⚠️ SECURITY NOTE**: Do not use default passwords in production. Generate secure secrets:

```bash
# Generate a secure session secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start the Application

```bash
# Build and start all services
docker-compose up --build

# Or for background mode
docker-compose up -d --build
```

### 4. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api (via nginx proxy)
- **Backend Direct** (local only): http://localhost:5000/api

### 5. Verify Health Status

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mongodb
```

---

## Architecture

### Services

#### 1. **Frontend** (Nginx + Vite-built React)
- Serves static React application
- Proxies API calls to backend
- Port: 80
- Health check: GET /

#### 2. **Backend** (Express.js + TypeScript)
- REST API server
- Port: 5000 (internal to Docker network)
- Connects to MongoDB
- Health check: GET /api/health

#### 3. **MongoDB** (Document Database)
- Database service
- Port: 27017 (internal to Docker network only)
- Persistent volume: `mongodb_data`
- Health check: mongosh ping command

### Networking

- **Internal Docker Network** (`trackhub-network`):
  - Backend connects to MongoDB via: `mongodb://admin:pass@mongodb:27017/trackhub`
  - Frontend proxies API requests to backend via nginx
  - Services communicate via service names (DNS resolution)

- **External Access**:
  - Frontend: Port 80 (HTTP)
  - Backend: Port 5000 (localhost only, for dev)
  - MongoDB: Port 27017 (localhost only)

### Data Persistence

Volumes configured in `docker-compose.yml`:

- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration
- `backend_logs` - Backend application logs

All volumes are preserved when containers are stopped/restarted.

---

## Common Commands

### Start Services

```bash
# Build and start all services (foreground)
docker-compose up --build

# Start in background
docker-compose up -d --build

# Start without rebuild
docker-compose up -d
```

### Stop Services

```bash
# Stop all services (keeps data in volumes)
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop, remove containers, and remove volumes (⚠️ DATA LOSS)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mongodb

# Last 50 lines
docker-compose logs --tail 50

# Watch logs in real-time
docker-compose logs -f backend
```

### Manage Containers

```bash
# Check status
docker-compose ps

# Restart a service
docker-compose restart backend

# Execute command in running container
docker-compose exec backend npm run build

# SSH into container
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Database Operations

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p changeme

# Backup database
docker-compose exec mongodb mongodump --uri="mongodb://admin:changeme@localhost:27017/trackhub" --out=/dump

# View MongoDB logs
docker-compose logs -f mongodb
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Backend server port | `5000` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://admin:pass@mongodb:27017/trackhub` |
| `AUTH_SESSION_SECRET` | Session encryption secret | `your_32_char_random_string` |
| `FRONTEND_URL` | CORS origin | `http://localhost` |
| `SEED_*_PASSWORD` | Demo user passwords | `Admin@12345!` |

### Frontend Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API endpoint | `/api` (for Docker) |
| `NODE_ENV` | Build environment | `production` |

---

## Troubleshooting

### Container Fails to Start

```bash
# Check logs
docker-compose logs backend

# Rebuild image
docker-compose build --no-cache backend

# Verify environment variables
docker-compose config
```

### MongoDB Connection Error

```bash
# Check if MongoDB is healthy
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Verify connection string in backend logs
docker-compose logs backend | grep -i mongodb

# Try manual connection
docker-compose exec mongodb mongosh -u admin -p changeme
```

### Frontend Cannot Reach Backend API

1. Check nginx configuration: `nginx.conf`
2. Verify backend is running: `docker-compose ps backend`
3. Check backend health: `docker-compose exec backend curl http://localhost:5000/api/health`
4. Check nginx logs: `docker-compose logs frontend | grep proxy`
5. Verify CORS settings in backend/middleware/errorHandler.ts

### Session/Cookie Issues

- Frontend must access via `http://localhost` (not `127.0.0.1`)
- Cookies are HTTP-only and SameSite=Lax
- Session persists across requests within same container

### Port Already in Use

```bash
# If port 80 is already in use
# Option 1: Stop the conflicting service
lsof -i :80
kill -9 <PID>

# Option 2: Change port in docker-compose.yml
# Change "ports: - '80:80'" to "ports: - '8080:80'"
```

---

## Production Deployment Checklist

- [ ] Change all default passwords
- [ ] Generate secure `AUTH_SESSION_SECRET` (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Configure email service (`SUPPORT_EMAIL`, `RESEND_API_KEY`)
- [ ] Set up proper MongoDB backups
- [ ] Enable HTTPS/SSL (using reverse proxy like Nginx)
- [ ] Configure logging and monitoring
- [ ] Test authentication flows thoroughly
- [ ] Verify CORS settings for production domain
- [ ] Set up health monitoring for containers
- [ ] Configure volume backups
- [ ] Document any custom configuration changes

---

## Monitoring and Health Checks

All services include health checks that run every 30 seconds:

```bash
# View health status
docker-compose ps

# Check specific service health
docker inspect trackhub-frontend --format='{{.State.Health.Status}}'
```

---

## Development vs Production

### Development
```bash
# Use docker-compose.yml with dev settings
docker-compose up --build
docker-compose logs -f backend  # Watch logs
```

### Production
```bash
# Use .env with secure values
# Consider using docker-compose.prod.yml or environment overrides
docker-compose -f docker-compose.yml up -d
```

---

## Next Steps

1. **CI/CD Pipeline** - Set up GitHub Actions for automated builds/deployments
2. **SSL/HTTPS** - Add reverse proxy (Nginx, Traefik) with SSL certificates
3. **Logging** - Configure centralized logging (ELK stack, Datadog)
4. **Backup Strategy** - Implement MongoDB backup and restore procedures
5. **Kubernetes** - Migrate to Kubernetes for production scaling

---

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Verify .env configuration: `docker-compose config`
3. Test individual services: `docker-compose exec <service> <command>`
4. Check Docker installation: `docker version`

---

## References

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp)
- [Nginx Documentation](https://nginx.org/en/docs)
