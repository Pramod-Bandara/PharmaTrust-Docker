#!/bin/bash
set -e

# PharmaTrust Clean Build Script
# This script performs a complete clean build of all Docker services
# Compatible with macOS and Linux

echo "🧹 PharmaTrust Clean Build Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

print_success "Docker is running"

# Check if docker compose is available
if ! docker compose version > /dev/null 2>&1; then
    print_error "docker compose command not found. Please install Docker Compose v2+"
    exit 1
fi

print_success "Docker Compose is available"

# Step 1: Verify lockfiles
echo ""
echo "📦 Step 1: Verifying package-lock.json files..."
echo "----------------------------------------------"
if [ -f "./scripts/verify-lockfiles.sh" ]; then
    if ./scripts/verify-lockfiles.sh; then
        print_success "All lockfiles present"
    else
        print_error "Some lockfiles are missing"
        print_info "Run: ./scripts/generate-lockfiles.sh"
        exit 1
    fi
else
    print_warning "Lockfile verification script not found, skipping..."
fi

# Step 2: Stop all running containers
echo ""
echo "🛑 Step 2: Stopping all containers..."
echo "--------------------------------------"
if docker compose ps -q 2>/dev/null | grep -q .; then
    docker compose down -v --remove-orphans
    print_success "Containers stopped and volumes removed"
else
    print_info "No running containers to stop"
fi

# Step 3: Clean Docker system
echo ""
echo "🧼 Step 3: Cleaning Docker system..."
echo "-------------------------------------"
read -p "Remove ALL unused Docker data (images, containers, volumes)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker system prune -af --volumes
    print_success "Docker system cleaned"
else
    # Just remove PharmaTrust images
    print_info "Removing only PharmaTrust images..."
    docker images | grep pharmatrust | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    print_success "PharmaTrust images removed"
fi

# Step 4: Build images
echo ""
echo "🏗️  Step 4: Building Docker images..."
echo "--------------------------------------"
print_info "This may take 5-15 minutes depending on your internet speed..."
echo ""

# Build with no cache for clean build
if docker compose build --no-cache --progress=plain; then
    print_success "All images built successfully"
else
    print_error "Build failed. Check the error messages above."
    echo ""
    print_info "Troubleshooting tips:"
    echo "  1. Check your internet connection"
    echo "  2. Try: npm config set fetch-timeout 120000"
    echo "  3. If behind proxy, set npm proxy config"
    echo "  4. See TROUBLESHOOTING.md for more help"
    exit 1
fi

# Step 5: Start services
echo ""
echo "🚀 Step 5: Starting services..."
echo "--------------------------------"

# Start infrastructure first
print_info "Starting infrastructure services (mongo, redis, mosquitto)..."
docker compose up -d mongo redis mosquitto

# Wait for health checks
print_info "Waiting 30 seconds for infrastructure health checks..."
sleep 30

# Check infrastructure health
if docker compose ps mongo redis mosquitto | grep -q "unhealthy"; then
    print_error "Some infrastructure services are unhealthy"
    docker compose ps mongo redis mosquitto
    exit 1
fi
print_success "Infrastructure services are healthy"

# Start application services
print_info "Starting application services..."
docker compose up -d auth medicine iot blockchain mobile-gateway

# Wait for health checks
print_info "Waiting 30 seconds for application services health checks..."
sleep 30

# Start web and gateway
print_info "Starting web frontend and API gateway..."
docker compose up -d web nginx

# Wait for final health checks
print_info "Waiting 30 seconds for final health checks..."
sleep 30

# Step 6: Verify deployment
echo ""
echo "✅ Step 6: Verifying deployment..."
echo "----------------------------------"

# Check all services status
if docker compose ps | grep -q "unhealthy\|Exit"; then
    print_error "Some services failed to start properly"
    echo ""
    docker compose ps
    echo ""
    print_info "Check logs with: docker compose logs [service-name]"
    exit 1
fi

# Display status
echo ""
docker compose ps
echo ""

# Test endpoints
print_info "Testing endpoints..."

# Test web UI
if curl -f -s http://localhost > /dev/null 2>&1; then
    print_success "Web UI is accessible at http://localhost"
else
    print_warning "Web UI is not responding yet (may need more time)"
fi

# Test API services
for port in 4001 4002 4003 4004 4010; do
    if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
        print_success "Service on port $port is healthy"
    else
        print_warning "Service on port $port not responding (may need more time)"
    fi
done

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Build and deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Access the application:"
echo "  • Web UI:        http://localhost"
echo "  • API Gateway:   http://localhost/api"
echo "  • Auth Service:  http://localhost:4001"
echo "  • Medicine:      http://localhost:4002"
echo "  • IoT:           http://localhost:4003"
echo "  • Blockchain:    http://localhost:4004"
echo "  • Mobile GW:     http://localhost:4010"
echo ""
print_info "Demo credentials:"
echo "  • Manufacturer:  mfg1 / demo123"
echo "  • Supplier:      sup1 / demo123"
echo "  • Pharmacist:    phm1 / demo123"
echo "  • Admin:         admin / admin123"
echo ""
print_info "Useful commands:"
echo "  • View logs:     docker compose logs -f [service]"
echo "  • Stop all:      docker compose down"
echo "  • Restart:       docker compose restart [service]"
echo "  • Check status:  docker compose ps"
echo ""
print_success "Setup complete! 🚀"
