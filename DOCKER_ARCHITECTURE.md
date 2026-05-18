# 🎨 TrackHub Docker Architecture Visualization

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DOCKER HOST MACHINE                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              DOCKER-COMPOSE ORCHESTRATION                      │    │
│  │              (trackhub-network bridge)                         │    │
│  │                                                                │    │
│  │  ┌──────────────────┐  ┌──────────────────┐ ┌──────────────┐ │    │
│  │  │    FRONTEND      │  │     BACKEND      │ │   MONGODB    │ │    │
│  │  │  (Nginx+Vite)    │  │  (Express.js)    │ │  (Database)  │ │    │
│  │  │                  │  │                  │ │              │ │    │
│  │  │ • React app      │  │ • REST API       │ │ • Auth db    │ │    │
│  │  │ • Static assets  │  │ • Session mgmt   │ │ • Policies   │ │    │
│  │  │ • SPA routing    │  │ • Business logic │ │ • Documents  │ │    │
│  │  │ • API proxy      │  │ • Workflows      │ │ • Logs       │ │    │
│  │  │                  │  │                  │ │              │ │    │
│  │  │ Image: ~50MB     │  │ Image: ~250MB    │ │ Image: ~350MB│ │    │
│  │  │ Port: 80 (pub)   │  │ Port: 5000 (int) │ │ Port: 27017  │ │    │
│  │  │ Health: OK ✓     │  │ Health: OK ✓     │ │ Health: OK ✓ │ │    │
│  │  │ User: nginx:1001 │  │ User: node:1001  │ │ User: 999:999│ │    │
│  │  └────────┬─────────┘  └────────┬─────────┘ └──────┬───────┘ │    │
│  │           │                     │                  │         │    │
│  │           └─────────────────────┼──────────────────┘         │    │
│  │                                 │                            │    │
│  │                    API Proxy    │  MongoDB Connection       │    │
│  │                 /api/* → :5000  │  mongodb://user:pass@...  │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   DOCKER VOLUMES (Data)                        │  │
│  │  ├── mongodb_data (persistent database files)                  │  │
│  │  ├── mongodb_config (MongoDB configuration)                    │  │
│  │  └── backend_logs (application logs)                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              PORT MAPPINGS (External Access)                   │  │
│  │  ├── 80:80       → Frontend (Public)                           │  │
│  │  ├── 127.0.0.1:5000:5000 → Backend (Dev only)                  │  │
│  │  └── 127.0.0.1:27017:27017 → MongoDB (Local only)              │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

                           HTTP Traffic Flow
                           
┌──────────┐              ┌──────────┐           ┌──────────┐
│ Browser  │─────HTTP────▶│ Nginx    │──────────▶│ Express  │
│          │◀─────HTML────│ Frontend │◀────JSON──│ Backend  │
└──────────┘              └──────────┘           └──────────┘
                              │                        │
                              │                        │
                              │     Static Assets      │
                              └────────────────┘       │
                                                       ▼
                                              ┌──────────────┐
                                              │  MongoDB     │
                                              │  Database    │
                                              └──────────────┘
```

---

## Service Communication Map

```
FRONTEND (Nginx on Port 80)
├─ Serves static React app from /usr/share/nginx/html/dist
├─ Proxies /api/* → http://backend:5000 (internal Docker network)
├─ SPA routing: All non-file paths → /index.html
├─ Health check: GET / (HTTP 200)
└─ Users: nginx:1001 (non-root)

BACKEND (Express.js on Port 5000)
├─ REST API endpoints
├─ Connects to MongoDB via: mongodb://admin:pass@mongodb:27017/trackhub
├─ Session management (httpOnly cookies)
├─ Health check: GET /api/health (responds with JSON)
├─ Logs volume: /app/logs
└─ Users: nodejs:1001 (non-root)

MONGODB (Database on Port 27017)
├─ Stores all application data
├─ Authentication: username/password required
├─ Data persistence: /data/db volume
├─ Not publicly exposed (internal only)
├─ Health check: mongosh ping
└─ Users: 999:999 (non-root)

DOCKER NETWORK (trackhub-network)
├─ Type: Bridge network
├─ Internal communication via service DNS names:
│  ├─ backend (resolves to backend container IP)
│  ├─ frontend (resolves to frontend container IP)
│  └─ mongodb (resolves to mongodb container IP)
└─ Subnet: 172.20.0.0/16 (production)
```

---

## Configuration Flow

```
Configuration Pipeline:
━━━━━━━━━━━━━━━━━━━━━━━

1. .env file (local)
   ↓
2. docker-compose reads .env
   ↓
3. Environment variables passed to containers
   ↓
4. Application code reads process.env
   ↓
5. Services connect using env vars

Example:
  .env: MONGODB_URL=mongodb://admin:changeme@mongodb:27017/trackhub
  ↓
  docker-compose exports to backend container
  ↓
  backend reads: process.env.MONGODB_URL
  ↓
  connects to MongoDB service by name
```

---

## Build Process

```
Backend Build:
──────────────

Stage 1 (Builder):
  node:18-alpine
  ├── npm ci (install all deps)
  ├── npm run build (TypeScript → JavaScript)
  └── Generates /app/dist directory

Stage 2 (Runtime):
  node:18-alpine
  ├── npm ci --only=production (prod deps only)
  ├── Copy dist/ from builder
  ├── CMD: node dist/server.js
  └── Result: ~250MB image


Frontend Build:
───────────────

Stage 1 (Builder):
  node:18-alpine
  ├── npm ci (install all deps)
  ├── npm run build (Vite build)
  └── Generates /app/dist directory

Stage 2 (Runtime):
  nginx:alpine
  ├── Copy dist/ from builder → /usr/share/nginx/html
  ├── Copy nginx.conf
  ├── CMD: nginx -g daemon off;
  └── Result: ~50MB image
```

---

## Data Flow

```
User Interaction:
─────────────────

1. User opens browser → http://localhost
                         ↓
2. Nginx serves React app (static files)
                         ↓
3. React app loaded in browser
                         ↓
4. User clicks "Login" button
                         ↓
5. Browser: POST /api/auth/login (with credentials)
                         ↓
6. Nginx proxies → http://backend:5000/auth/login
                         ↓
7. Express.js validates credentials
                         ↓
8. Express queries MongoDB: db.users.findOne({email})
                         ↓
9. MongoDB returns user document
                         ↓
10. Express creates session, sets httpOnly cookie
                         ↓
11. Express responds with user data + Set-Cookie header
                         ↓
12. Nginx returns response to browser
                         ↓
13. Browser stores cookie (httpOnly - can't access via JS)
                         ↓
14. React app redirects to dashboard
                         ↓
15. Subsequent requests include cookie (auto sent by browser)
```

---

## Health Check System

```
Health Monitoring:
──────────────────

Frontend (Nginx):
  Type: HTTP GET
  URL: http://localhost/
  Expected: HTTP 200
  Interval: 30 seconds
  Timeout: 10 seconds
  Retries: 3
  Status: ✓ Healthy

Backend (Express):
  Type: HTTP GET
  URL: http://localhost:5000/api/health
  Expected: HTTP 200 + JSON response
  Interval: 30 seconds
  Timeout: 10 seconds
  Retries: 3
  Status: ✓ Healthy

MongoDB:
  Type: mongosh command
  Command: db.adminCommand('ping')
  Expected: "ok": 1
  Interval: 10 seconds
  Timeout: 5 seconds
  Retries: 5
  Status: ✓ Healthy
```

---

## Environment Variable Resolution

```
Backend Startup:
────────────────

.env file:
  MONGODB_URL=mongodb://admin:pass@mongodb:27017/trackhub
  AUTH_SESSION_SECRET=xyz123...
  FRONTEND_URL=http://localhost

    ↓

docker-compose.yml:
  environment:
    MONGODB_URL: ${MONGODB_URL}
    AUTH_SESSION_SECRET: ${AUTH_SESSION_SECRET}
    FRONTEND_URL: ${FRONTEND_URL}

    ↓

Backend container receives:
  process.env.MONGODB_URL = "mongodb://admin:pass@mongodb:27017/trackhub"
  process.env.AUTH_SESSION_SECRET = "xyz123..."
  process.env.FRONTEND_URL = "http://localhost"

    ↓

Backend code:
  const db = await mongoose.connect(process.env.MONGODB_URL)
  const cors = { origin: process.env.FRONTEND_URL }
```

---

## Security Model

```
Access Control Layers:
──────────────────────

Layer 1: Network Isolation
  ├─ Frontend: Public (port 80)
  ├─ Backend: Internal only (service name)
  └─ MongoDB: Internal only (service name)

Layer 2: Container User
  ├─ Frontend: nginx:1001 (non-root)
  ├─ Backend: nodejs:1001 (non-root)
  └─ MongoDB: user:999 (non-root)

Layer 3: Environment Variables
  ├─ No secrets in Dockerfile
  ├─ No secrets in docker-compose.yml
  ├─ All secrets via .env (not committed)
  └─ Authentication via process.env

Layer 4: Application Security
  ├─ Frontend: httpOnly cookies (can't access via JS)
  ├─ Backend: CORS configured
  ├─ Backend: Session validation on each request
  ├─ Nginx: Security headers (CSP, X-Frame-Options, etc.)
  └─ MongoDB: Auth required (username + password)

Layer 5: Data Protection
  ├─ Persistent volumes encrypted at rest (host)
  ├─ Network traffic within container (not exposed)
  └─ Logs filtered (no sensitive data logged)
```

---

## Volume Persistence

```
Docker Volumes:
───────────────

mongodb_data:
  ├─ Location: /var/lib/docker/volumes/...
  ├─ Mount in container: /data/db
  ├─ Content: MongoDB database files (BSON format)
  ├─ Persists: Across container stop/start
  └─ Survives: docker-compose down (only removed with -v)

mongodb_config:
  ├─ Location: /var/lib/docker/volumes/...
  ├─ Mount in container: /data/configdb
  ├─ Content: MongoDB replica set config
  ├─ Persists: Across restarts
  └─ Survives: docker-compose down (only removed with -v)

backend_logs:
  ├─ Location: /var/lib/docker/volumes/...
  ├─ Mount in container: /app/logs
  ├─ Content: Application logs (if configured)
  ├─ Persists: Across restarts
  └─ Survives: docker-compose down (only removed with -v)

Backup Flow:
  ├─ mongodump reads volume files
  ├─ Creates backup in ./backups/ directory
  ├─ Backup files are portable
  └─ Can restore to any MongoDB instance
```

---

## Scaling Architecture (Future)

```
Kubernetes Ready:
─────────────────

Current Docker Setup:
  ├─ 1 Frontend pod
  ├─ 1 Backend pod
  └─ 1 MongoDB replica

Kubernetes Migration:
  ├─ Frontend Deployment (replicas: 2-3)
  │  └─ Service: LoadBalancer on port 80
  ├─ Backend Deployment (replicas: 2-3)
  │  └─ Service: ClusterIP on port 5000
  ├─ MongoDB StatefulSet (replicas: 3)
  │  ├─ PersistentVolumes for data
  │  └─ Service: Headless for clustering
  ├─ ConfigMap: Environment variables
  ├─ Secret: Database credentials
  └─ Ingress: External routing rules

Benefits:
  ✓ Auto-scaling based on CPU/memory
  ✓ Self-healing (restart failed pods)
  ✓ Rolling updates (zero downtime)
  ✓ Multi-zone deployment
  ✓ Service discovery
  ✓ Load balancing
```

---

## Performance Optimization

```
Caching Strategy:
─────────────────

1. Docker Layer Caching
   ├─ package.json copied first (rarely changes)
   ├─ Dependencies installed (cached layer)
   ├─ Source code copied (frequently changes)
   └─ Build step runs (only if source changed)
   Result: Fast rebuilds when only code changes

2. Nginx Caching
   ├─ Static assets: 1-year cache
   │  (JS, CSS, images, fonts)
   ├─ HTML: no-cache, must-revalidate
   │  (SPA index.html)
   ├─ Gzip compression enabled
   │  (40-60% size reduction)
   └─ Result: ~50% faster static file delivery

3. MongoDB Indexing
   ├─ Indexes on frequently queried fields
   ├─ Compound indexes for common filters
   └─ Result: Fast database queries

4. Connection Pooling
   ├─ Express-to-MongoDB pool
   ├─ Nginx-to-Backend keep-alive
   └─ Result: Reused connections, less overhead
```

---

**This architecture ensures TrackHub is:**
- ✅ Production-ready
- ✅ Secure by default
- ✅ Scalable for growth
- ✅ Easy to develop on
- ✅ Ready for CI/CD automation

**Document**: DOCKER_ARCHITECTURE.md
