# PharmaTrust Docker Deployment Guide

This guide provides comprehensive instructions for deploying the PharmaTrust pharmaceutical supply chain system using Docker, **without requiring npm, pnpm, or other development tools on the host machine**.

## 🚀 Quick Start (No Dev Tools Required)

### Prerequisites
- Docker Engine 20.10+ 
- Docker Compose 2.0+
- 8GB+ RAM recommended
- 10GB+ free disk space

### One-Command Deployment
```bash
# Clone the repository
git clone <repository-url>
cd PharmaTrust-MS

# Copy environment template
cp .env.example .env

# Start all services (builds automatically)
docker-compose up -d

# Wait for services to be healthy (2-3 minutes)
docker-compose ps

# Access the application
open http://localhost:80
```

That's it! No npm, node, or other tools needed on your machine.

## 📋 System Architecture

The PharmaTrust system consists of 8 containerized services:

```
┌─────────────────────────────────────────────────────────────┐
│                    NGINX Gateway (Port 80)                  │
├─────────────────────────────────────────────────────────────┤
│  Next.js Web App (3000) │  Mobile Gateway (4010)           │
├──────────────────────────┼───────────────────────────────────┤
│  Auth Service (4001)     │  Medicine Service (4002)         │
├──────────────────────────┼───────────────────────────────────┤
│  IoT Service (4003)      │  Blockchain Service (4004)       │
├──────────────────────────┴───────────────────────────────────┤
│  MongoDB (27017)         │  Redis (6379)                    │
└─────────────────────────────────────────────────────────────┘
```

### Service Details

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| **nginx** | 80, 443 | API Gateway & Load Balancer | `http://localhost:80` |
| **web** | 3000 | Next.js Frontend Application | `http://localhost:3000` |
| **auth** | 4001 | Authentication & User Management | `http://localhost:4001/health` |
| **medicine** | 4002 | Medicine Batch Management | `http://localhost:4002/health` |
| **iot** | 4003 | IoT Data & WebSocket Server | `http://localhost:4003/health` |
| **blockchain** | 4004 | Blockchain Integration | `http://localhost:4004/health` |
| **mobile-gateway** | 4010 | Mobile API Gateway | `http://localhost:4010/health` |
| **mongo** | 27017 | Primary Database | Internal |
| **redis** | 6379 | Caching & Session Store | Internal |

## 🔧 Configuration Options

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Security (REQUIRED in production)
JWT_SECRET=your-super-secret-jwt-key-here

# Blockchain (Optional)
THIRDWEB_SECRET_KEY=your-thirdweb-secret-key
CONTRACT_ADDRESS=your-contract-address
BLOCKCHAIN_NETWORK=polygon-mumbai

# Development Options
NODE_ENV=production
DEMO_MODE=true
ENABLE_MOCK_BLOCKCHAIN=true
```

### Production Security Checklist

- [ ] Change `JWT_SECRET` to a strong random key
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper SSL certificates
- [ ] Set up firewall rules
- [ ] Enable container security scanning
- [ ] Configure log aggregation

## 🏗️ Deployment Scenarios

### 1. Development Deployment
```bash
# Uses docker-compose.override.yml for hot reloading
docker-compose up -d

# View logs
docker-compose logs -f

# Access mongo-express (database UI)
open http://localhost:8081
```

### 2. Production Deployment
```bash
# Production mode (no overrides)
docker-compose -f docker-compose.yml up -d

# Or use production-specific compose file
docker-compose -f docker-compose.prod.yml up -d
```

### 3. CI/CD Deployment
The system includes GitHub Actions workflow (`.github/workflows/docker-ci.yml`) that:
- Builds and tests all services
- Pushes images to GitHub Container Registry
- Creates production deployment artifacts

### 4. Cloud Deployment

#### AWS ECS
```bash
# Install AWS CLI and ECS CLI
# Configure AWS credentials
ecs-cli configure --cluster pharmatrust --default-launch-type EC2 --config-name pharmatrust
ecs-cli up --keypair your-key --capability-iam --size 2 --instance-type t3.medium
ecs-cli compose up
```

#### Google Cloud Run
```bash
# Build and push images
docker-compose build
docker tag pharmatrust_web gcr.io/your-project/pharmatrust-web
docker push gcr.io/your-project/pharmatrust-web

# Deploy to Cloud Run
gcloud run deploy pharmatrust-web --image gcr.io/your-project/pharmatrust-web
```

#### Azure Container Instances
```bash
# Create resource group and deploy
az group create --name pharmatrust --location eastus
az container create --resource-group pharmatrust --file docker-compose.yml
```

## 🔍 Monitoring & Health Checks

### Health Check Endpoints
All services include health check endpoints:
```bash
# Check all service health
curl http://localhost:4001/health  # Auth
curl http://localhost:4002/health  # Medicine
curl http://localhost:4003/health  # IoT
curl http://localhost:4004/health  # Blockchain
curl http://localhost:4010/health  # Mobile Gateway
curl http://localhost:3000         # Web App
curl http://localhost:80           # NGINX Gateway
```

### Service Status
```bash
# View service status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# View resource usage
docker stats

# Check health status
docker-compose ps --filter "status=running"
```

### Database Access
```bash
# MongoDB (Development)
open http://localhost:8081  # mongo-express UI

# MongoDB (Direct)
docker exec -it pharmatrust-mongo mongosh pharmatrust

# Redis
docker exec -it pharmatrust-redis redis-cli
```

## 🧪 Testing & Validation

### Automated Testing
```bash
# Run integration tests
cd scripts
npm install
npm run test

# Seed demo data
npm run setup

# Validate setup
npm run validate
```

### Manual Testing Checklist

1. **Service Health**: All services return 200 on health endpoints
2. **Web Access**: Frontend loads at http://localhost:80
3. **Authentication**: Login with demo credentials works
4. **Database**: MongoDB contains demo data
5. **WebSocket**: Real-time IoT data streaming works
6. **API Gateway**: All API routes proxy correctly

### Demo Credentials
```
Manufacturer: mfg1 / demo123
Supplier: sup1 / demo123
Pharmacist: phm1 / demo123
Admin: admin / admin123
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker daemon
docker version

# Check available resources
docker system df
docker system prune  # Clean up if needed

# Check port conflicts
netstat -tulpn | grep :80
```

#### Build Failures
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild specific service
docker-compose build --no-cache [service-name]

# Check build logs
docker-compose build [service-name] 2>&1 | tee build.log
```

#### Network Issues
```bash
# Check Docker networks
docker network ls
docker network inspect pharmatrust-ms_pharmanet

# Restart networking
docker-compose down
docker network prune
docker-compose up -d
```

#### Database Issues
```bash
# Reset database
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d

# Check MongoDB logs
docker-compose logs mongo

# Backup/Restore
docker exec pharmatrust-mongo mongodump --out /backup
docker cp pharmatrust-mongo:/backup ./backup
```

### Performance Optimization

#### Resource Limits
Add to docker-compose.yml:
```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

#### Scaling Services
```bash
# Scale specific services
docker-compose up -d --scale web=3 --scale auth=2

# Load balance with NGINX
# (Configure upstream in nginx.conf)
```

## 📊 Monitoring & Logging

### Log Aggregation
```bash
# Centralized logging
docker-compose logs -f --tail=100

# Service-specific logs
docker-compose logs -f web
docker-compose logs -f auth

# Export logs
docker-compose logs --no-color > pharmatrust.log
```

### Metrics Collection
```bash
# Container metrics
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# System metrics
docker system df
docker system events
```

## 🔐 Security Best Practices

### Container Security
- All services run as non-root users
- Multi-stage builds minimize attack surface
- Health checks ensure service reliability
- Resource limits prevent resource exhaustion

### Network Security
- Services communicate via internal Docker network
- Only necessary ports exposed to host
- NGINX acts as reverse proxy and security layer

### Data Security
- JWT tokens for authentication
- Environment variables for secrets
- Volume mounts for data persistence
- Regular security updates via base image updates

## 📈 Scaling & Production Considerations

### Horizontal Scaling
```bash
# Scale web tier
docker-compose up -d --scale web=3

# Scale API services
docker-compose up -d --scale auth=2 --scale medicine=2
```

### Load Balancing
Configure NGINX upstream blocks for scaled services:
```nginx
upstream web_backend {
    server web_1:3000;
    server web_2:3000;
    server web_3:3000;
}
```

### Database Scaling
- MongoDB replica sets for high availability
- Redis clustering for cache scaling
- Read replicas for query performance

### Monitoring Stack
Consider adding:
- Prometheus for metrics
- Grafana for dashboards
- ELK stack for log analysis
- Jaeger for distributed tracing

## 🎯 Summary

This Docker setup provides:

✅ **Zero Host Dependencies**: No npm, node, or dev tools required  
✅ **Complete Isolation**: All services containerized  
✅ **Production Ready**: Multi-stage builds, health checks, security  
✅ **CI/CD Compatible**: GitHub Actions pipeline included  
✅ **Scalable Architecture**: Microservices with API gateway  
✅ **Comprehensive Monitoring**: Health checks and logging  
✅ **Easy Deployment**: One-command startup  
✅ **Development Friendly**: Hot reloading and debugging support  

The PharmaTrust system is now fully containerized and ready for deployment in any environment that supports Docker, from local development to cloud production environments.
