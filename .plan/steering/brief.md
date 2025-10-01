# PharmaTrust Project Brief - Context Engineering Document

## 🎯 Project Identity & Scope
**Project**: PharmaTrust - Pharmaceutical Supply Chain Management System  
**Type**: Non-production university project (demo-focused, minimal complexity)  
**Timeline**: 8-day development cycle  
**Goal**: Complete pharmaceutical traceability from manufacturer to end-user with IoT monitoring

## 🧠 Mental Model & Architecture Pattern
```
[Arduino DHT22] --HTTP--> [IoT Service] -> [Redis]* -> [Medicine Service] --MongoDB--> [4 Dashboards (Next.js Web)]
                                     |                               ^
                                     v                               |
                               [Auth Service] <---- [NGINX API Gateway] <---- [Mobile QR Scanner]
                                     |
                                     v
                              [Blockchain Service] --> [thirdweb/Polygon]
```

**Core Flow**: Manufacturer creates batch → IoT monitors environment → Supplier tracks → Pharmacist verifies → Customer scans QR → Blockchain confirms authenticity

## 📋 Key Context Anchors

### Stakeholder Roles (4 Web Dashboards)
1. **Manufacturer**: Create batches, monitor quality status
2. **Supplier**: Real-time environmental monitoring with charts
3. **Pharmacist**: Verify batch authenticity, view supply chain
4. **Admin**: Generate QR codes, manage batches, system overview

### Mobile App Context
- **Single-page QR scanner** (React Native/Expo)
- No login, no persistence
- Scan → Extract batchId → API call → Show "Authentic/Suspicious"

### IoT Integration Context
- **Arduino Uno + DHT22** sensor
- HTTP POST to `/api/iot-data` every 30 seconds
- Temperature: 2-25°C safe range
- Humidity: 30-70% safe range
- Anomaly detection triggers quality status changes

## 🔧 Technical Stack Decisions & Rationale

### Ultra-Minimal Stack (Non-Production) — Microservices with Docker
- **Frontend**: Next.js 14 (containerized web service)
- **API Gateway**: NGINX (routes to backend services)
- **Backend Services**: Node.js/Express (Auth, Medicine, IoT, Blockchain)
- **Database**: MongoDB (Docker for local, Atlas for prod)
- **Messaging/Cache**: Redis (pub/sub, caching). RabbitMQ optional for richer queues
- **Auth**: JWT (demo users only)
- **Blockchain**: thirdweb SDK (Polygon testnet)
- **Mobile**: Expo React Native
- **UI**: shadcn/ui + Tailwind

### Anti-Patterns Avoided
- ❌ Monolithic tight coupling of UI and backend
- ❌ Advanced RBAC systems (demo uses roles but remains simple)
- ❌ Production-grade security (demo scope)
- ❌ Heavy observability stacks beyond essentials (optional only)
- ❌ Multi-environment sprawl (keep dev simple; optional prod notes)

## 🎨 Design Philosophy & Constraints

### University Project Constraints
- **Speed over robustness**: Fast demos, minimal code
- **Simplicity over scalability**: ~25 files total vs 100+ enterprise
- **Demo-first**: Working prototype over production-ready
- **Learning-focused**: Clear code over optimized performance

### Key Design Decisions
1. **Microservices with Docker**: Separate services (web, auth, medicine, iot, blockchain) with an **NGINX API gateway**
2. **MongoDB collections** instead of complex relational schemas
3. **Simple anomaly detection** (statistical) instead of complex ML
4. **Mock blockchain** acceptable if thirdweb unavailable
5. **Manual testing** acceptable over comprehensive test suites

## 📊 Data Model Mental Map

### Core Entities
```typescript
MedicineBatch {
  batchId: "BATCH_timestamp"
  name: string
  currentStage: "manufacturer" | "supplier" | "pharmacist" | "customer"
  qualityStatus: "good" | "compromised" | "unknown"
  supplyChain: SupplyChainEntry[]
  blockchainHash?: string
}

EnvironmentalData {
  batchId: string
  temperature: number
  humidity: number
  isAnomaly: boolean
  severity?: "low" | "medium" | "high"
}
```

### MongoDB Collections
- `medicine_batches`: Batch records with supply chain history
- `environmental_data`: IoT sensor readings with anomaly flags
- `users`: Demo user accounts (mfg1/demo123, sup1/demo123, etc.)

## 🔄 Critical Workflows

### Primary Demo Flow
1. **Admin**: Create batch → Generate QR code
2. **Arduino**: Send temp/humidity → Anomaly detection
3. **Supplier**: View real-time charts → Monitor alerts
4. **Customer**: Scan QR → Verify authenticity
5. **System**: Show complete traceability

### Anomaly Detection Logic
```javascript
// Range-based: temp < 2°C or > 25°C = HIGH severity
// Humidity: < 30% or > 70% = MEDIUM severity  
// Rate-of-change: >5°C or >15% humidity per minute = MEDIUM severity
```

## 🚀 Implementation Strategy

### Development Phases (8 days)
1. **Days 1-2**: Next.js setup, MongoDB, basic APIs
2. **Days 3-4**: 4 dashboards with real data
3. **Days 5-6**: Arduino integration, anomaly detection
4. **Days 7-8**: Mobile app, blockchain, end-to-end testing

### Success Metrics
- ✅ All 4 dashboards functional
- ✅ Arduino posting data every 30s
- ✅ Mobile QR scanning works
- ✅ Anomaly detection triggers alerts
- ✅ Blockchain verification (or mock)

## 🎪 Demo Script Context
**5-minute demo flow**:
1. Show manufacturer creating batch
2. Arduino sensor data flowing to supplier dashboard
3. Generate QR code in admin panel
4. Scan QR with mobile app
5. Show "Authentic" verification result

## 🔍 Context Recovery Triggers
**When resuming work, check**:
- Current task in `/tasks.md` (17 total tasks)
- Demo user credentials: mfg1/demo123, sup1/demo123, phm1/demo123, admin/admin123
- Arduino posting to `http://localhost:3000/api/iot-data`
- QR codes encode: `{"batchId": "BATCH_123", "url": "pharmatrust://verify"}`
- MongoDB running on `mongodb://localhost:27017/pharmatrust`

## 🧩 Integration Points
- **Arduino → IoT Service**: HTTP POST with temp/humidity JSON
- **Web/Mobile → API Gateway**: Requests routed to services (auth, medicine, iot, blockchain)
- **Services → Blockchain**: thirdweb NFT minting/verification
- **Database → UI**: Real-time polling/WebSocket from IoT service
- **Anomaly → Quality**: IoT service updates quality in medicine service

This brief serves as a complete mental model reconstruction tool for rapid context switching and knowledge transfer between sessions.
