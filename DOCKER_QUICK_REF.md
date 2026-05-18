# TrackHub Docker - Quick Reference Card

## 🚀 START HERE

```bash
# 1. Clone and setup
cd trackhub-dict
cp .env.example .env

# 2. Edit .env with your values (use make validate-env to check)
vim .env

# 3. Start all services
docker-compose up -d --build

# 4. Verify everything
docker-compose ps
```

---

## ⚡ Essential Commands

### Startup & Shutdown
```bash
# Start services (background)
docker-compose up -d --build

# Start with logs visible
docker-compose up --build

# Stop services (keep data)
docker-compose stop

# Stop and remove (keep volumes/data)
docker-compose down

# Delete everything including data ⚠️
docker-compose down -v
```

### Using Makefile (Recommended)
```bash
make docker-up              # Start all services
make docker-logs            # View all logs
make docker-logs-backend    # View backend only
make docker-down            # Stop all services
make docker-health          # Check service health
make docker-ps              # List containers
```

---

## 🔍 Monitoring & Debugging

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Last 50 lines
docker-compose logs --tail 50
```

### Check Services
```bash
# List containers with status
docker-compose ps

# Check health status
docker-compose ps --format "table {{.Service}}\t{{.Health}}"

# Inspect single service
docker-compose exec backend curl http://localhost:5000/api/health
```

### Execute Commands
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# MongoDB shell
docker-compose exec mongodb mongosh -u admin -p changeme

# Run specific command
docker-compose exec backend npm run build
```

---

## 🔧 Configuration

### Generate Secure Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Validate Environment
```bash
docker-compose config  # Check syntax
make validate-env       # Check required vars
```

### View Resolved Config
```bash
docker-compose config | less
```

---

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost | Web UI |
| Backend API | http://localhost/api | API endpoint |
| Health Check | http://localhost/api/health | Service status |
| MongoDB | localhost:27017 | Database (internal) |

---

## 📦 Database Operations

### Backup MongoDB
```bash
make docker-db-backup
# Creates ./backups/backup_YYYYMMDD_HHMMSS/
```

### Access MongoDB
```bash
docker-compose exec mongodb mongosh -u admin -p changeme
# Show databases
> show dbs
# Use database
> use trackhub
# Show collections
> show collections
# Query data
> db.users.find()
```

---

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend

# Rebuild image
docker-compose build --no-cache backend
docker-compose up backend
```

### MongoDB connection error
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb

# Try direct connection
docker-compose exec mongodb mongosh -u admin -p changeme
```

### Frontend can't reach backend
```bash
# Check backend health
curl http://localhost/api/health

# Check nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Check backend logs
docker-compose logs backend | grep error
```

### Port already in use
```bash
# Find process using port 80
lsof -i :80
kill -9 <PID>

# Or change port in docker-compose.yml
# Change: "ports: - '80:80'" to "ports: - '8080:80'"
```

---

## 🔐 Security Checklist

- [ ] Changed default MongoDB password
- [ ] Generated secure AUTH_SESSION_SECRET (32+ chars)
- [ ] Updated all SEED_*_PASSWORD values
- [ ] .env file is in .gitignore
- [ ] No secrets in code or Dockerfile
- [ ] FRONTEND_URL matches your domain
- [ ] CORS settings verify frontend URL

---

## 📊 Status Check Command

```bash
# One-liner to check everything
docker-compose ps && echo "---" && \
curl -s http://localhost/api/health | jq . && echo "---" && \
docker-compose exec -T mongodb mongosh -u admin -p changeme --eval "db.adminCommand('ping')"
```

---

## 🚀 Production Deployment

```bash
# Use production compose file with resource limits
docker-compose -f docker-compose.prod.yml up -d --build

# Or using Makefile
make docker-prod-up

# Verify production config
docker-compose -f docker-compose.prod.yml ps
```

---

## 🧹 Cleanup Commands

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything except volumes
docker system prune

# Remove everything including volumes (⚠️ DATA LOSS)
docker system prune -a --volumes
```

---

## 📚 Detailed Guides

- **Full Setup Guide**: See `DOCKER_SETUP.md`
- **Implementation Details**: See `DOCKER_IMPLEMENTATION_SUMMARY.md`
- **Architecture Overview**: See `SYSTEM_ARCHITECTURE_OVERVIEW.md`

---

## 💡 Pro Tips

1. **Use Makefile** - Faster and more reliable than typing commands
2. **Watch Logs** - Always have `make docker-logs-backend` running while developing
3. **Health Checks** - Run `make docker-test-health` regularly
4. **Backups** - Weekly backups: `make docker-db-backup`
5. **Clean Builds** - When stuck, try: `make docker-rebuild`

---

## 🎯 Common Workflows

### Local Development
```bash
make docker-up
make docker-logs-backend  # In another terminal
# Edit code
# Changes auto-sync to container
make docker-restart backend
```

### Testing Backend API
```bash
# Check health
curl http://localhost/api/health

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@12345!"}'
```

### Database Inspection
```bash
make docker-sh-mongo
> db.users.find()
> db.policies.countDocuments()
> exit
```

### Full Rebuild
```bash
make docker-clean
make docker-build
make docker-up
```

---

**Questions?** Check `DOCKER_SETUP.md` for complete documentation.
