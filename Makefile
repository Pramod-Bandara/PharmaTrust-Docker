# PharmaTrust Docker Management Makefile
# Provides convenient commands for managing the Docker deployment

.PHONY: help build up down logs clean test setup validate health status

# Default target
help: ## Show this help message
	@echo "PharmaTrust Docker Management Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup    # First time setup with demo data"
	@echo "  make up       # Start all services"
	@echo "  make health   # Check service health"
	@echo "  make logs     # View logs"
	@echo "  make down     # Stop all services"

# Environment setup
.env:
	@echo "Creating .env file from template..."
	@cp .env.example .env
	@echo "✅ .env file created. Edit it to customize your configuration."

# Build commands
build: .env ## Build all Docker images
	@echo "Building all Docker images..."
	@docker-compose build --parallel
	@echo "✅ All images built successfully"

build-clean: .env ## Build all images without cache
	@echo "Building all Docker images (no cache)..."
	@docker-compose build --no-cache --parallel
	@echo "✅ All images built successfully"

# Service management
up: .env ## Start all services
	@echo "Starting all services..."
	@docker-compose up -d
	@echo "✅ All services started"
	@echo "🌐 Access the application at: http://localhost:80"
	@echo "📊 Database UI at: http://localhost:8081 (admin/admin123)"

down: ## Stop all services
	@echo "Stopping all services..."
	@docker-compose down
	@echo "✅ All services stopped"

restart: down up ## Restart all services

# Development commands
dev: .env ## Start in development mode with hot reloading
	@echo "Starting in development mode..."
	@docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "✅ Development environment started"
	@echo "🔥 Hot reloading enabled for all services"

prod: .env ## Start in production mode
	@echo "Starting in production mode..."
	@docker-compose -f docker-compose.yml up -d
	@echo "✅ Production environment started"

# Monitoring commands
logs: ## View logs from all services
	@docker-compose logs -f --tail=100

logs-%: ## View logs from specific service (e.g., make logs-web)
	@docker-compose logs -f --tail=100 $*

health: ## Check health of all services
	@echo "Checking service health..."
	@echo "Service Status:"
	@docker-compose ps
	@echo ""
	@echo "Health Checks:"
	@curl -s -o /dev/null -w "Auth Service: %{http_code}\n" http://localhost:4001/health || echo "Auth Service: DOWN"
	@curl -s -o /dev/null -w "Medicine Service: %{http_code}\n" http://localhost:4002/health || echo "Medicine Service: DOWN"
	@curl -s -o /dev/null -w "IoT Service: %{http_code}\n" http://localhost:4003/health || echo "IoT Service: DOWN"
	@curl -s -o /dev/null -w "Blockchain Service: %{http_code}\n" http://localhost:4004/health || echo "Blockchain Service: DOWN"
	@curl -s -o /dev/null -w "Mobile Gateway: %{http_code}\n" http://localhost:4010/health || echo "Mobile Gateway: DOWN"
	@curl -s -o /dev/null -w "Web Application: %{http_code}\n" http://localhost:3000 || echo "Web Application: DOWN"
	@curl -s -o /dev/null -w "NGINX Gateway: %{http_code}\n" http://localhost:80 || echo "NGINX Gateway: DOWN"

status: ## Show detailed service status
	@echo "=== Docker Compose Services ==="
	@docker-compose ps
	@echo ""
	@echo "=== Container Resource Usage ==="
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
	@echo ""
	@echo "=== Docker System Info ==="
	@docker system df

# Database commands
db-shell: ## Open MongoDB shell
	@docker exec -it pharmatrust-mongo mongosh pharmatrust

db-backup: ## Backup database
	@echo "Creating database backup..."
	@docker exec pharmatrust-mongo mongodump --out /backup --db pharmatrust
	@docker cp pharmatrust-mongo:/backup ./backup-$(shell date +%Y%m%d-%H%M%S)
	@echo "✅ Database backup created"

db-restore: ## Restore database from backup (requires BACKUP_DIR variable)
	@if [ -z "$(BACKUP_DIR)" ]; then echo "❌ Please specify BACKUP_DIR: make db-restore BACKUP_DIR=./backup-20231201-120000"; exit 1; fi
	@echo "Restoring database from $(BACKUP_DIR)..."
	@docker cp $(BACKUP_DIR) pharmatrust-mongo:/restore
	@docker exec pharmatrust-mongo mongorestore --drop --db pharmatrust /restore/pharmatrust
	@echo "✅ Database restored"

redis-shell: ## Open Redis CLI
	@docker exec -it pharmatrust-redis redis-cli

# Testing and setup commands
test: ## Run integration tests
	@echo "Running integration tests..."
	@cd scripts && npm install && npm run test
	@echo "✅ All tests passed"

setup: up ## Complete setup with demo data
	@echo "Setting up PharmaTrust with demo data..."
	@sleep 30  # Wait for services to be ready
	@cd scripts && npm install && npm run setup
	@echo "✅ Setup complete!"
	@echo ""
	@echo "🎉 PharmaTrust is ready!"
	@echo "🌐 Web Application: http://localhost:80"
	@echo "📊 Database UI: http://localhost:8081 (admin/admin123)"
	@echo ""
	@echo "Demo Credentials:"
	@echo "  Manufacturer: mfg1 / demo123"
	@echo "  Supplier: sup1 / demo123"
	@echo "  Pharmacist: phm1 / demo123"
	@echo "  Admin: admin / admin123"

validate: ## Validate system setup
	@echo "Validating system setup..."
	@cd scripts && npm install && npm run validate
	@echo "✅ System validation complete"

# Cleanup commands
clean: down ## Stop services and remove containers
	@echo "Cleaning up containers..."
	@docker-compose down --remove-orphans
	@echo "✅ Containers removed"

clean-all: down ## Stop services and remove containers, volumes, and images
	@echo "Cleaning up everything (containers, volumes, images)..."
	@docker-compose down --remove-orphans --volumes --rmi all
	@docker system prune -f
	@echo "✅ Complete cleanup done"

clean-data: ## Remove all data volumes (WARNING: This deletes all data!)
	@echo "⚠️  WARNING: This will delete all database data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose down -v
	@echo "✅ All data volumes removed"

# Utility commands
shell-%: ## Open shell in specific service container (e.g., make shell-web)
	@docker exec -it pharmatrust-$* /bin/sh

exec-%: ## Execute command in specific service (e.g., make exec-web CMD="npm install")
	@docker exec -it pharmatrust-$* $(CMD)

pull: ## Pull latest base images
	@echo "Pulling latest base images..."
	@docker-compose pull
	@echo "✅ Latest images pulled"

update: pull build restart ## Update and restart all services

# CI/CD commands
ci-test: ## Run CI tests (used by GitHub Actions)
	@echo "Running CI tests..."
	@docker-compose build --parallel
	@docker-compose up -d
	@sleep 60
	@make health
	@cd scripts && npm install && npm run setup
	@docker-compose down -v

# Security commands
security-scan: ## Run security scan on images
	@echo "Running security scans..."
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image pharmatrust-ms_web:latest
	@echo "✅ Security scan complete"

# Backup and maintenance
backup-all: db-backup ## Create complete system backup
	@echo "Creating complete system backup..."
	@docker-compose pause
	@tar -czf backup-complete-$(shell date +%Y%m%d-%H%M%S).tar.gz \
		backup-* .env docker-compose.yml
	@docker-compose unpause
	@echo "✅ Complete backup created"

# Quick commands for common workflows
first-run: build setup ## First time setup (build + setup + demo data)

quick-start: up health ## Quick start for existing setup

demo: setup ## Setup demo environment
	@echo "🎬 Demo environment ready!"
	@echo "Visit http://localhost:80 and login with demo credentials"

# Help for specific topics
help-credentials: ## Show demo credentials
	@echo "Demo Credentials:"
	@echo "  Manufacturer: mfg1 / demo123"
	@echo "  Supplier: sup1 / demo123"
	@echo "  Pharmacist: phm1 / demo123"
	@echo "  Admin: admin / admin123"

help-urls: ## Show important URLs
	@echo "Important URLs:"
	@echo "  🌐 Main Application: http://localhost:80"
	@echo "  📊 Database UI: http://localhost:8081"
	@echo "  🔧 Auth Service: http://localhost:4001"
	@echo "  💊 Medicine Service: http://localhost:4002"
	@echo "  📡 IoT Service: http://localhost:4003"
	@echo "  ⛓️  Blockchain Service: http://localhost:4004"
	@echo "  📱 Mobile Gateway: http://localhost:4010"

help-troubleshooting: ## Show troubleshooting tips
	@echo "Troubleshooting Tips:"
	@echo "  1. Check service health: make health"
	@echo "  2. View logs: make logs"
	@echo "  3. Restart services: make restart"
	@echo "  4. Clean and rebuild: make clean build up"
	@echo "  5. Check system resources: make status"
	@echo "  6. For persistent issues: make clean-all && make first-run"

# MQTT commands
mqtt-test: ## Test MQTT broker connection
	@echo "Testing MQTT broker..."
	@docker exec pharmatrust-mosquitto mosquitto_pub -t "test" -m "PharmaTrust MQTT test message"
	@echo "✅ MQTT test message published"

mqtt-subscribe: ## Subscribe to all PharmaTrust MQTT topics
	@echo "Subscribing to PharmaTrust MQTT topics..."
	@echo "Press Ctrl+C to stop"
	@docker exec -it pharmatrust-mosquitto mosquitto_sub -t "pharmatrust/+/+"

mqtt-logs: ## View MQTT broker logs
	@docker-compose logs mosquitto

mqtt-shell: ## Open MQTT broker shell
	@docker exec -it pharmatrust-mosquitto sh

mqtt-status: ## Check MQTT broker status
	@echo "MQTT Broker Status:"
	@docker-compose ps mosquitto
	@echo ""
	@echo "MQTT Broker Logs (last 10 lines):"
	@docker-compose logs --tail=10 mosquitto
