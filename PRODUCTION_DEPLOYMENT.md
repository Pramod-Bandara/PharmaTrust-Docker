# PharmaTrust Production Deployment Guide

This guide provides step-by-step instructions for deploying PharmaTrust to production environments.

## 🎯 Overview

PharmaTrust can be deployed in multiple configurations:
- **Full Cloud Deployment**: Web app on Vercel, services on cloud platforms, MongoDB Atlas
- **Hybrid Deployment**: Web app on Vercel, services on Docker containers, cloud database
- **Local Production**: All services on local infrastructure with production configurations

## 📋 Prerequisites

### Required Accounts
- [ ] **Vercel Account** - For web application deployment
- [ ] **MongoDB Atlas Account** - For production database
- [ ] **Expo Account** - For mobile app deployment
- [ ] **thirdweb Account** - For blockchain integration (optional)

### Required Tools
- [ ] **Node.js 18+** - For running deployment scripts
- [ ] **Docker & Docker Compose** - For containerized services
- [ ] **Expo CLI** - For mobile app deployment
- [ ] **Vercel CLI** - For web deployment (optional)

## 🗄️ Step 1: Configure MongoDB Atlas

### 1.1 Create MongoDB Atlas Cluster
```bash
# 1. Go to https://cloud.mongodb.com/
# 2. Create a new project: "PharmaTrust"
# 3. Create a cluster (M0 Free tier is sufficient for demo)
# 4. Configure network access (allow your IP or 0.0.0.0/0 for demo)
# 5. Create database user with read/write permissions
```

### 1.2 Get Connection String
```bash
# Format: mongodb+srv://username:password@cluster.mongodb.net/pharmatrust
# Example: mongodb+srv://pharmatrust:your-password@cluster0.abc123.mongodb.net/pharmatrust
```

### 1.3 Initialize Database
```bash
cd scripts
npm install
MONGODB_URI="your-atlas-connection-string" npm run setup
```

## 🌐 Step 2: Deploy Web Application to Vercel

### 2.1 Prepare Environment Variables
Create environment variables in Vercel dashboard:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pharmatrust
MONGODB_DB=pharmatrust

# Security
JWT_SECRET=your-production-jwt-secret-key-change-this
JWT_EXPIRES_IN=24h

# API URLs (update after service deployment)
AUTH_SERVICE_URL=https://pharmatrust-auth.vercel.app
MEDICINE_SERVICE_URL=https://pharmatrust-medicine.vercel.app
IOT_SERVICE_URL=https://pharmatrust-iot.vercel.app
BLOCKCHAIN_SERVICE_URL=https://pharmatrust-blockchain.vercel.app
MOBILE_GATEWAY_URL=https://pharmatrust-mobile.vercel.app

# Public URLs
NEXT_PUBLIC_API_URL=https://pharmatrust.vercel.app
NEXT_PUBLIC_WS_URL=wss://pharmatrust-iot.vercel.app

# Blockchain (optional)
THIRDWEB_SECRET_KEY=your-thirdweb-secret-key
CONTRACT_ADDRESS=your-contract-address
BLOCKCHAIN_NETWORK=polygon-mainnet

# Production flags
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 2.2 Deploy to Vercel
```bash
# Option 1: Using Vercel CLI
cd web
npx vercel --prod

# Option 2: Connect GitHub repository to Vercel
# 1. Go to https://vercel.com/dashboard
# 2. Import your GitHub repository
# 3. Configure environment variables
# 4. Deploy
```

### 2.3 Configure Custom Domain (Optional)
```bash
# In Vercel dashboard:
# 1. Go to your project settings
# 2. Add custom domain: pharmatrust.yourdomain.com
# 3. Configure DNS records as instructed
```

## 🔧 Step 3: Deploy Microservices

### 3.1 Option A: Deploy Each Service to Vercel

Each service can be deployed as a separate Vercel project:

```bash
# Deploy auth service
cd services/auth
npx vercel --prod

# Deploy medicine service
cd services/medicine
npx vercel --prod

# Deploy IoT service
cd services/iot
npx vercel --prod

# Deploy blockchain service
cd services/blockchain
npx vercel --prod

# Deploy mobile gateway
cd services/mobile-gateway
npx vercel --prod
```

### 3.2 Option B: Deploy Services to Cloud Platforms

#### Railway Deployment
```bash
# 1. Connect GitHub repository to Railway
# 2. Create separate services for each microservice
# 3. Configure environment variables for each service
# 4. Deploy using Railway's automatic deployment
```

#### DigitalOcean App Platform
```bash
# 1. Create new app from GitHub repository
# 2. Configure each service as a separate component
# 3. Set environment variables
# 4. Deploy
```

### 3.3 Option C: Docker Container Deployment

```bash
# Build and push containers
docker build -t pharmatrust/auth ./services/auth
docker build -t pharmatrust/medicine ./services/medicine
docker build -t pharmatrust/iot ./services/iot
docker build -t pharmatrust/blockchain ./services/blockchain
docker build -t pharmatrust/mobile-gateway ./services/mobile-gateway

# Deploy to your container platform (AWS ECS, Google Cloud Run, etc.)
```

## 📱 Step 4: Deploy Mobile Application

### 4.1 Configure Expo Project
```bash
cd mobile

# Install Expo CLI if not already installed
npm install -g @expo/cli

# Login to Expo
expo login

# Configure project ID
expo init --template blank-typescript
```

### 4.2 Update Configuration
```bash
# Update app.json with your project details
# Update eas.json with your build configuration
# Ensure API URLs point to your deployed services
```

### 4.3 Build and Deploy
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform all --profile production

# Submit to app stores (optional)
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## 🔗 Step 5: Configure Arduino IoT Integration

### 5.1 Option A: WiFi-Enabled Arduino (ESP32/ESP8266)
```cpp
// Update WiFi credentials and API endpoint in Arduino code
const char* ssid = "your-wifi-network";
const char* password = "your-wifi-password";
const char* apiEndpoint = "https://pharmatrust.vercel.app/api/iot/readings";
```

### 5.2 Option B: USB Fallback (Arduino Uno)
```bash
# Install Node.js dependencies
cd scripts
npm install

# Run USB forwarder (adjust port for your system)
npm run arduino /dev/ttyUSB0 https://pharmatrust.vercel.app/api/iot/readings

# Windows example:
npm run arduino COM3 https://pharmatrust.vercel.app/api/iot/readings
```

## 🔐 Step 6: Configure Blockchain Integration

### 6.1 thirdweb Setup
```bash
# 1. Go to https://thirdweb.com/dashboard
# 2. Create a new project
# 3. Deploy an NFT contract on Polygon mainnet
# 4. Get your secret key and contract address
# 5. Update environment variables
```

### 6.2 Alternative: Mock Blockchain
```bash
# For demo purposes, you can use mock blockchain
ENABLE_MOCK_BLOCKCHAIN=true
```

## 🧪 Step 7: Testing Production Deployment

### 7.1 Automated Testing
```bash
cd scripts

# Test all endpoints
npm run integration

# Test ML integration
npm run test:ml

# Validate deployment
npm run validate
```

### 7.2 Manual Testing Checklist
- [ ] **Web Dashboard Access**: All 4 dashboards load correctly
- [ ] **Authentication**: Login works for all user roles
- [ ] **Batch Creation**: Manufacturer can create batches
- [ ] **IoT Data**: Arduino data appears in supplier dashboard
- [ ] **QR Generation**: Admin can generate QR codes
- [ ] **Mobile Verification**: QR scanning works in mobile app
- [ ] **Blockchain Verification**: Batch authenticity verification works

### 7.3 Performance Testing
```bash
# Load test API endpoints
npx autocannon https://pharmatrust.vercel.app/api/health -c 10 -d 30

# Monitor response times and error rates
```

## 📊 Step 8: Monitoring and Maintenance

### 8.1 Set Up Monitoring
```bash
# Vercel Analytics (built-in)
# MongoDB Atlas Monitoring (built-in)
# Custom monitoring with services like:
# - Uptime Robot
# - Pingdom
# - New Relic
```

### 8.2 Backup Strategy
```bash
# MongoDB Atlas automatic backups (enabled by default)
# Code repository backups (GitHub)
# Environment variable backups (secure storage)
```

### 8.3 Update Process
```bash
# 1. Test changes in development
# 2. Update staging environment
# 3. Run automated tests
# 4. Deploy to production
# 5. Monitor for issues
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear build cache
rm -rf .next node_modules
npm install
npm run build
```

#### Database Connection Issues
```bash
# Test MongoDB connection
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient('your-connection-string');
client.connect().then(() => console.log('Connected')).catch(console.error);
"
```

#### API Endpoint Issues
```bash
# Test API endpoints
curl https://pharmatrust.vercel.app/api/health
curl https://pharmatrust.vercel.app/api/auth/verify
```

#### Arduino Connection Issues
```bash
# List available serial ports
node -e "
const { SerialPort } = require('serialport');
SerialPort.list().then(ports => console.log(ports));
"

# Test Arduino USB forwarder
npm run arduino:help
```

### Performance Optimization

#### Database Optimization
```javascript
// Ensure proper indexes are created
db.medicine_batches.createIndex({ "batchId": 1 });
db.environmental_data.createIndex({ "batchId": 1, "timestamp": -1 });
```

#### API Optimization
```javascript
// Enable caching for static data
// Use connection pooling for database
// Implement rate limiting for public endpoints
```

## 📚 Additional Resources

- [Vercel Deployment Documentation](https://vercel.com/docs)
- [MongoDB Atlas Setup Guide](https://docs.atlas.mongodb.com/)
- [Expo Deployment Guide](https://docs.expo.dev/distribution/introduction/)
- [thirdweb Documentation](https://portal.thirdweb.com/)
- [Docker Deployment Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🆘 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs in your deployment platform
3. Test individual components in isolation
4. Verify environment variables are correctly set
5. Ensure all services can communicate with each other

## 🔄 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Build process successful
- [ ] Dependencies updated

### Deployment
- [ ] Web application deployed to Vercel
- [ ] Microservices deployed and accessible
- [ ] Database migrated and seeded
- [ ] Mobile app built and distributed
- [ ] Arduino integration configured

### Post-Deployment
- [ ] All endpoints responding correctly
- [ ] Authentication working
- [ ] Real-time features functional
- [ ] Mobile app connecting to APIs
- [ ] Monitoring configured
- [ ] Backup strategy implemented

---

**Note**: This is a university project deployment guide. For production enterprise deployment, additional security measures, monitoring, and compliance requirements should be implemented.
