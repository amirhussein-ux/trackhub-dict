# CI/CD Secrets & Configuration Setup Guide

## Overview
This guide walks you through setting up the GitHub Actions CI/CD pipeline for TrackHub with Docker Hub & Render deployment.

---

## Part 1: GitHub Secrets Configuration

Navigate to your repository → **Settings → Secrets and variables → Actions** and add the following secrets:

### Docker Hub Secrets
| Secret Name | Description | Example |
|---|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username | `amirreza` |
| `DOCKER_PASSWORD` | Docker Hub personal access token | (generate at https://hub.docker.com/settings/security) |

### Render Deployment Secrets
| Secret Name | Description | How to Get |
|---|---|---|
| `RENDER_DEPLOY_KEY` | Render API key | [Render Dashboard → Account → API Keys](https://dashboard.render.com/api-keys) |
| `RENDER_FRONTEND_SERVICE_ID` | Frontend service ID | View in Render dashboard URL: `https://dashboard.render.com/web/srv-xxxxx` |
| `RENDER_BACKEND_SERVICE_ID` | Backend service ID | View in Render dashboard URL: `https://dashboard.render.com/web/srv-xxxxx` |

### Frontend Build Secrets
| Secret Name | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API URL | `https://trackhub-backend.onrender.com/api` |

---

## Part 2: How to Get Render Secrets

### Step 1: Get Render Deploy Key
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click your profile icon → **Account settings**
3. Scroll to **API Keys** section
4. Create a new API key (or copy existing one)
5. Copy the key value to `RENDER_DEPLOY_KEY` secret

### Step 2: Get Service IDs
1. Go to Render Dashboard
2. Click on your **Frontend Service**
3. Copy the Service ID from the URL bar
   - Example: If URL is `https://dashboard.render.com/web/srv-abc123def456`, then Service ID is `srv-abc123def456`
4. Paste to `RENDER_FRONTEND_SERVICE_ID`
5. Repeat for Backend Service → `RENDER_BACKEND_SERVICE_ID`

---

## Part 3: Pipeline Workflow Explanation

### Pipeline Flow:
```
1. Code pushed to main branch
   ↓
2. Parallel builds:
   ├─ build-backend: Docker image built & pushed to Docker Hub
   └─ build-frontend: Frontend built (Vite production build)
   ↓
3. Deployment:
   ├─ deploy-frontend: Triggers Render frontend redeployment
   └─ deploy-backend: Triggers Render backend redeployment
```

### What Each Job Does:

**build-backend**:
- Builds Docker image from `./backend/Dockerfile`
- Pushes to Docker Hub with tags: `latest`, `branch-name`, `commit-sha`
- Uses GitHub Actions cache for faster builds

**build-frontend**:
- Installs npm dependencies
- Builds Vite production bundle
- Uploads artifacts for deployment step

**deploy-frontend**:
- Downloads build artifacts
- Calls Render API to redeploy static site
- Happens only after frontend build succeeds

**deploy-backend**:
- Calls Render API to redeploy backend service
- Render automatically pulls latest image from Docker Hub
- Happens only after backend build succeeds

---

## Part 4: Render Configuration (Backend)

### On Render Dashboard - Backend Service Settings:

1. **Build Command**:
   ```bash
   npm install && npm run build
   ```

2. **Start Command**:
   ```bash
   npm start
   ```

3. **Environment Variables** (set in Render Dashboard):
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.onrender.com
   AUTH_SESSION_SECRET=<your-32-char-secret>
   MONGODB_URI=<your-mongodb-atlas-uri>
   PORT=3000
   SENDGRID_API_KEY=<if-using-sendgrid>
   ```

4. **Docker** (Backend Service):
   - Runtime: **Docker**
   - Publish Port: **3000**
   - Pull Policy: **Always pull latest** ✓

---

## Part 5: Render Configuration (Frontend)

### On Render Dashboard - Frontend Service Settings:

1. **Service Type**: **Static Site**

2. **Build Command**:
   ```bash
   npm install && npm run build
   ```

3. **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

---

## Part 6: Docker Hub Setup (Optional but Recommended)

### Create Docker Hub Personal Access Token:

1. Go to [Docker Hub](https://hub.docker.com)
2. Sign in to your account
3. Click your profile icon → **Account Settings**
4. Go to **Security**
5. Click **New Access Token**
6. Give it a name (e.g., "GitHub Actions")
7. Copy the token
8. Paste to GitHub secret `DOCKER_PASSWORD`

---

## Part 7: First Deployment Checklist

- [ ] All 5 secrets added to GitHub
- [ ] Backend service created on Render (Docker runtime)
- [ ] Frontend service created on Render (Static site)
- [ ] Backend has `MONGODB_URI` env var set
- [ ] Backend has `AUTH_SESSION_SECRET` (32+ chars) set
- [ ] Backend has `FRONTEND_URL` set to frontend URL
- [ ] Frontend has `VITE_API_URL` set to backend URL
- [ ] Push code to `main` branch
- [ ] Check GitHub Actions workflow runs successfully
- [ ] Verify both services deployed on Render

---

## Part 8: Troubleshooting

### Docker Build Fails
- **Check**: Backend Dockerfile exists at `./backend/Dockerfile`
- **Check**: `backend/package.json` has `build` script
- **Check**: Node version matches in Dockerfile

### Frontend Build Fails
- **Check**: Frontend package.json exists at root
- **Check**: `VITE_API_URL` is set in GitHub secrets
- **Check**: Build script runs locally: `npm run build`

### Render Deployment Fails
- **Check**: Service IDs are correct (copy from URL)
- **Check**: Deploy key is valid
- **Check**: Services exist on Render dashboard
- **Check**: Try manual deploy on Render first to rule out config issues

### Image Not Pulled by Render
- **Check**: Docker Hub credentials correct
- **Check**: Image name matches: `docker-username/trackhub-backend`
- **Check**: Backend service has Docker runtime selected

---

## Part 9: Environment Variables Reference

### Backend (.env)
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://trackhub-frontend.onrender.com
AUTH_SESSION_SECRET=<generate-32-char-secret>
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trackhub
DATABASE_NAME=trackhub
JWT_SECRET=<your-jwt-secret>
SENDGRID_API_KEY=<if-using-email>
RESEND_API_KEY=<if-using-resend>
```

### Frontend (.env)
```
VITE_API_URL=https://trackhub-backend.onrender.com/api
```

---

## Part 10: Running Locally with Docker

### Build backend image locally:
```bash
docker build -t trackhub-backend:local ./backend
```

### Run with docker-compose:
```bash
docker-compose -f docker-compose.yml up -d
```

---

## Monitoring & Logs

### GitHub Actions:
- Go to repo → **Actions** tab
- Click on workflow run to see real-time logs
- Failed jobs show error messages

### Render:
- Go to service dashboard
- Click **Logs** tab to see deployment logs
- Click **Events** to see deployment history

---

## Auto-Deployment on Code Push

Once configured, every push to `main` branch will:
1. Build backend Docker image (3-5 min)
2. Build frontend (1-2 min)
3. Push backend to Docker Hub (30 sec)
4. Trigger Render deployments (2-5 min)

**Total time**: ~10-15 minutes from push to live

---

## Useful Links

- [Render API Documentation](https://render.com/docs/api#deploy-service)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Hub Personal Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [Render Environment Variables](https://render.com/docs/environment-variables)
