.PHONY: help docker-up docker-down docker-logs docker-build docker-clean docker-health \
        docker-sh-backend docker-sh-frontend docker-sh-mongo docker-db-backup \
        env-setup validate-env

# Color output
BLUE=\033[0;34m
GREEN=\033[0;32m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Display this help message
	@echo "$(BLUE)TrackHub Docker Makefile$(NC)"
	@echo ""
	@echo "$(BLUE)Usage:$(NC) make [target]"
	@echo ""
	@echo "$(BLUE)Targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2}'

# ============================================
# Docker Compose Operations
# ============================================

docker-up: ## Start all services (build if needed)
	@echo "$(BLUE)Starting TrackHub services...$(NC)"
	docker-compose up -d --build
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo "  Frontend: http://localhost"
	@echo "  Backend: http://localhost/api"
	@make docker-health

docker-up-dev: ## Start services with logs visible (development mode)
	@echo "$(BLUE)Starting TrackHub in development mode...$(NC)"
	docker-compose up --build

docker-down: ## Stop all services (keep data)
	@echo "$(BLUE)Stopping TrackHub services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

docker-stop: ## Stop services without removing containers
	@echo "$(BLUE)Stopping containers...$(NC)"
	docker-compose stop
	@echo "$(GREEN)✓ Containers stopped$(NC)"

docker-restart: ## Restart all services
	@echo "$(BLUE)Restarting TrackHub services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

docker-clean: ## Remove containers, networks, and images (keep volumes)
	@echo "$(RED)Removing containers and images...$(NC)"
	docker-compose down --remove-orphans
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

docker-clean-all: ## Remove everything including volumes (⚠️ DATA LOSS)
	@echo "$(RED)⚠️  This will delete all data including MongoDB databases!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)✓ Complete cleanup finished$(NC)"; \
	fi

# ============================================
# Container Access
# ============================================

docker-sh-backend: ## Access backend container shell
	@echo "$(BLUE)Entering backend container...$(NC)"
	docker-compose exec backend sh

docker-sh-frontend: ## Access frontend container shell
	@echo "$(BLUE)Entering frontend container...$(NC)"
	docker-compose exec frontend sh

docker-sh-mongo: ## Access MongoDB shell
	@echo "$(BLUE)Entering MongoDB container...$(NC)"
	docker-compose exec mongodb mongosh -u ${MONGODB_USERNAME:-admin} -p ${MONGODB_PASSWORD:-changeme}

# ============================================
# Logging & Monitoring
# ============================================

docker-logs: ## View logs from all services
	@docker-compose logs -f

docker-logs-backend: ## View backend logs
	@docker-compose logs -f backend

docker-logs-frontend: ## View frontend logs
	@docker-compose logs -f frontend

docker-logs-mongo: ## View MongoDB logs
	@docker-compose logs -f mongodb

docker-ps: ## List running containers
	@docker-compose ps

docker-health: ## Check health status of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@docker-compose ps --format "table {{.Service}}\t{{.State}}\t{{.Health}}"

# ============================================
# Build Operations
# ============================================

docker-build: ## Build all images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build

docker-build-backend: ## Build backend image only
	@echo "$(BLUE)Building backend image...$(NC)"
	docker-compose build backend

docker-build-frontend: ## Build frontend image only
	@echo "$(BLUE)Building frontend image...$(NC)"
	docker-compose build frontend

docker-build-no-cache: ## Build all images without cache
	@echo "$(BLUE)Building images without cache...$(NC)"
	docker-compose build --no-cache

# ============================================
# Database Operations
# ============================================

docker-db-backup: ## Backup MongoDB database
	@echo "$(BLUE)Backing up MongoDB...$(NC)"
	@mkdir -p ./backups
	docker-compose exec -T mongodb mongodump \
		--uri="mongodb://admin:changeme@localhost:27017/trackhub" \
		--out=/tmp/backup && \
	docker cp trackhub-mongodb:/tmp/backup ./backups/backup_$$(date +%Y%m%d_%H%M%S)
	@echo "$(GREEN)✓ Backup complete$(NC)"

docker-db-restore: ## Restore MongoDB database (requires backup directory)
	@echo "$(BLUE)Restoring MongoDB...$(NC)"
	docker-compose exec -T mongodb mongorestore \
		--uri="mongodb://admin:changeme@localhost:27017/trackhub" \
		/tmp/backup
	@echo "$(GREEN)✓ Restore complete$(NC)"

docker-db-status: ## Check MongoDB connection and status
	@echo "$(BLUE)MongoDB Status:$(NC)"
	docker-compose exec -T mongodb mongosh \
		--eval "db.adminCommand('ping')" \
		-u admin -p changeme

# ============================================
# Environment & Configuration
# ============================================

env-setup: ## Create .env file from .env.example
	@if [ -f .env ]; then \
		echo "$(RED)✓ .env already exists$(NC)"; \
	else \
		echo "$(BLUE)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN)✓ .env created$(NC)"; \
		echo "$(BLUE)Please edit .env with your configuration$(NC)"; \
	fi

validate-env: ## Validate .env file exists and has required variables
	@echo "$(BLUE)Validating environment configuration...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)✗ .env file not found$(NC)"; \
		exit 1; \
	fi
	@if grep -q "AUTH_SESSION_SECRET" .env; then \
		echo "$(GREEN)✓ AUTH_SESSION_SECRET configured$(NC)"; \
	else \
		echo "$(RED)✗ AUTH_SESSION_SECRET missing$(NC)"; \
	fi
	@if grep -q "MONGODB_PASSWORD" .env; then \
		echo "$(GREEN)✓ MONGODB_PASSWORD configured$(NC)"; \
	else \
		echo "$(RED)✗ MONGODB_PASSWORD missing$(NC)"; \
	fi
	@echo "$(GREEN)✓ Environment validation complete$(NC)"

docker-config: ## Show resolved docker-compose configuration
	@docker-compose config

# ============================================
# Testing & Validation
# ============================================

docker-test-health: ## Test all service health endpoints
	@echo "$(BLUE)Testing service health...$(NC)"
	@echo "Testing frontend..."
	@curl -s http://localhost/ > /dev/null && echo "$(GREEN)✓ Frontend responding$(NC)" || echo "$(RED)✗ Frontend not responding$(NC)"
	@echo "Testing backend..."
	@curl -s http://localhost/api/health > /dev/null && echo "$(GREEN)✓ Backend responding$(NC)" || echo "$(RED)✗ Backend not responding$(NC)"
	@echo "Testing MongoDB..."
	@docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" -u admin -p changeme > /dev/null 2>&1 && echo "$(GREEN)✓ MongoDB responding$(NC)" || echo "$(RED)✗ MongoDB not responding$(NC)"

docker-test-api: ## Test backend API endpoints
	@echo "$(BLUE)Testing API endpoints...$(NC)"
	@echo "GET /api/health"
	@curl -s http://localhost/api/health | jq .

# ============================================
# Development Utilities
# ============================================

docker-rebuild: docker-clean docker-build docker-up ## Clean and rebuild everything
	@echo "$(GREEN)✓ Rebuild complete$(NC)"

docker-logs-tail: ## Show last 100 lines of logs from all services
	@docker-compose logs --tail 100

docker-exec-backend: ## Execute command in backend container (usage: make docker-exec-backend CMD="npm run build")
	@docker-compose exec backend $(CMD)

docker-exec-frontend: ## Execute command in frontend container (usage: make docker-exec-frontend CMD="npm list")
	@docker-compose exec frontend $(CMD)

# ============================================
# Production Commands
# ============================================

docker-prod-up: ## Start services with production compose file
	@echo "$(BLUE)Starting TrackHub in production mode...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d --build
	@echo "$(GREEN)✓ Production services started$(NC)"
	@make docker-health

docker-prod-down: ## Stop production services
	@echo "$(BLUE)Stopping production services...$(NC)"
	docker-compose -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Production services stopped$(NC)"
