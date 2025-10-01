### Kubernetes (optional)
```yaml
# Example K8s deployment snippet (optional)
apiVersion: apps/v1
kind: Deployment
metadata: { name: medicine }
spec:
  replicas: 2
  selector: { matchLabels: { app: medicine } }
  template:
    metadata: { labels: { app: medicine } }
    spec:
      containers:
        - name: medicine
          image: pharmatrust/medicine:latest
          env:
            - { name: MONGODB_URI, value: mongodb://mongodb:27017/pharmatrust }
```
### ADR-004: API Gateway with NGINX
**Decision**: Use NGINX as an API gateway/edge router  
**Rationale**: Simple routing, rate limiting, and TLS termination in front of multiple backend services  
**Implementation**: `gateway` service in Compose routes `/api/auth` → `auth`, `/api/medicine` → `medicine`, `/api/iot-data` → `iot`, `/api/blockchain` → `blockchain`, `/` → `web`
# PharmaTrust Technology Stack - Deep Context Engineering

## 🏗️ Architecture Decision Records (ADRs)

### ADR-001: Docker-based Microservices Architecture
**Decision**: Use Docker to run separate services: `gateway (NGINX)`, `web (Next.js)`, `auth (Express)`, `medicine (Express + MongoDB)`, `iot (Express + WebSocket/queues)`, `blockchain (Express + thirdweb)`  
**Rationale**: Clear separation of concerns, independent scaling, realistic integration points while remaining demo-friendly  
**Alternatives Rejected**: Single Next.js monolith (less realistic integration), serverless-only (harder to simulate local inter-service comms)  
**Implementation**: Docker Compose for local dev; optional Kubernetes for production

### ADR-002: MongoDB Document Database
**Decision**: MongoDB for all data storage  
**Rationale**: Flexible schema for IoT data, rapid prototyping, JSON-native  
**Alternatives Rejected**: PostgreSQL (too rigid), Firebase (vendor lock-in)  
**Implementation**: 3 collections, no complex relations, embedded documents

### ADR-003: Minimal Authentication
**Decision**: Custom JWT with hardcoded demo users  
**Rationale**: Demo-first, no user registration needed, role-based access  
**Alternatives Rejected**: NextAuth.js (overkill), Auth0 (external dependency)  
**Implementation**: 10-line auth service, localStorage tokens

## 🔧 Technology Deep Dive

### Frontend Stack
```typescript
// Next.js 14 App Router Configuration
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['mongodb']
  }
}

// shadcn/ui Components Used
- Card, CardContent, CardHeader, CardTitle
- Button, Input, Badge, Alert, AlertDescription
- Table, Tabs, TabsContent, TabsList, TabsTrigger
```

### Backend Services Architecture
```typescript
// Express service pattern (Auth service example)
import express from 'express';
import jwt from 'jsonwebtoken';
const app = express();
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  // validate against demo users
  const token = jwt.sign({ sub: username, role: 'manufacturer' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  res.json({ token });
});

// Middleware for service-to-service JWT auth
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(token, process.env.JWT_SECRET!); next(); }
  catch { return res.status(401).json({ error: 'Unauthorized' }); }
}

app.listen(4001);
```

```typescript
// Medicine service communicating with MongoDB
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db('pharmatrust');

// Example route
app.post('/api/medicine/batches', requireAuth, async (req, res) => {
  const batch = { ...req.body, createdAt: new Date(), batchId: `BATCH_${Date.now()}` };
  await db.collection('medicine_batches').insertOne(batch);
  res.json(batch);
});
```

### IoT Integration Stack
```cpp
// Arduino Libraries Used
#include <WiFi.h>          // ESP32 WiFi connectivity
#include <HTTPClient.h>    // HTTP POST requests
#include <DHT.h>          // DHT22 sensor library
#include <ArduinoJson.h>  // JSON payload creation

// Data Transmission Pattern
StaticJsonDocument<300> doc;
doc["temperature"] = temperature;
doc["humidity"] = humidity;
doc["deviceId"] = "DHT22_001";
doc["batchId"] = "BATCH_DEFAULT";
```

### Mobile Technology Stack
```typescript
// React Native Expo Configuration
{
  "expo": {
    "name": "PharmaTrust",
    "platforms": ["ios", "android"],
    "dependencies": {
      "expo-barcode-scanner": "~12.0.0",
      "@react-navigation/native": "^6.0.0",
      "@react-native-async-storage/async-storage": "^1.17.0"
    }
  }
}

// QR Scanner Implementation
import { BarCodeScanner } from 'expo-barcode-scanner';
const handleBarCodeScanned = ({ data }) => {
  const qrData = JSON.parse(data);
  verifyBatch(qrData.batchId);
};
```

### Blockchain Integration
```typescript
// thirdweb SDK Configuration
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
const sdk = new ThirdwebSDK("polygon-mumbai");

// NFT Metadata Structure
{
  name: "Medicine Batch BATCH_123",
  attributes: [
    { trait_type: "Batch ID", value: "BATCH_123" },
    { trait_type: "Manufacturer", value: "mfg1" },
    { trait_type: "Medicine Name", value: "Aspirin 500mg" }
  ]
}
```

## 📊 Data Flow Architecture

### Real-time Data Pipeline
```mermaid
sequenceDiagram
    Arduino->>+API: POST /api/iot-data
    API->>+AnomalyDetection: processReading()
    AnomalyDetection-->>-API: {isAnomaly, severity}
    API->>+MongoDB: store environmental_data
    API->>+MongoDB: update medicine_batch.qualityStatus
    MongoDB-->>-API: success
    API-->>-Arduino: {success: true, anomaly: false}
    
    Dashboard->>+API: GET /api/iot-data?batchId=X
    API->>+MongoDB: find environmental_data
    MongoDB-->>-API: readings[]
    API-->>-Dashboard: real-time data
```

### Authentication Flow
```mermaid
sequenceDiagram
    User->>+LoginPage: credentials + role
    LoginPage->>+AuthAPI: POST /api/auth
    AuthAPI->>+AuthService: validateUser()
    AuthService-->>-AuthAPI: {valid: true}
    AuthAPI->>+AuthService: signToken()
    AuthService-->>-AuthAPI: JWT token
    AuthAPI-->>-LoginPage: {token, role}
    LoginPage->>+Dashboard: redirect with token
    Dashboard->>+API: requests with Bearer token
```

## 🔍 Performance & Optimization Context

### Database Optimization
```javascript
// MongoDB Indexes for Performance
db.environmental_data.createIndex({ "batchId": 1, "timestamp": -1 });
db.medicine_batches.createIndex({ "batchId": 1 });
db.medicine_batches.createIndex({ "manufacturerId": 1 });

// Query Patterns
// Real-time data (last 50 readings)
db.environmental_data.find({batchId}).sort({timestamp: -1}).limit(50);

// Anomaly detection (recent anomalies)
db.environmental_data.find({batchId, isAnomaly: true}).sort({timestamp: -1}).limit(10);
```

### Frontend Performance
```typescript
// React Optimization Patterns
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

// Polling for real-time updates (supplier dashboard)
useEffect(() => {
  const interval = setInterval(fetchEnvironmentalData, 10000); // 10s polling
  return () => clearInterval(interval);
}, []);

// Chart performance (limit data points)
const chartData = environmentalData.slice(0, 50).map(reading => ({
  time: new Date(reading.timestamp).toLocaleTimeString(),
  temperature: reading.temperature,
  humidity: reading.humidity
})).reverse();
```

## 🚀 Deployment Configuration

### Environment Variables
```bash
# Development (.env.local)
MONGODB_URI=mongodb://localhost:27017/pharmatrust
JWT_SECRET=your-super-secret-key-for-demo
THIRDWEB_SECRET_KEY=your-thirdweb-key

# Production (Vercel)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pharmatrust
JWT_SECRET=production-secret-key
THIRDWEB_SECRET_KEY=production-thirdweb-key
NEXT_PUBLIC_API_URL=https://pharmatrust.vercel.app
```

### Docker Configuration
```yaml
# docker-compose.yml (Development)
version: '3.9'
services:
  gateway:
    image: nginx:alpine
    volumes:
      - ./infra/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - '3000:80'
    depends_on: [web, auth, medicine, iot, blockchain]

  web:
    build: ./web
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on: [auth, medicine, iot, blockchain]

  auth:
    build: ./services/auth
    environment:
      - JWT_SECRET=demo-secret

  medicine:
    build: ./services/medicine
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/pharmatrust
      - JWT_SECRET=demo-secret
    depends_on: [mongodb]

  iot:
    build: ./services/iot
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/pharmatrust
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=demo-secret
    depends_on: [mongodb, redis]

  blockchain:
    build: ./services/blockchain
    environment:
      - THIRDWEB_SECRET_KEY=${THIRDWEB_SECRET_KEY}
      - JWT_SECRET=demo-secret

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    ports:
      - '27017:27017'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  mongo-express:
    image: mongo-express:latest
    ports:
      - '8081:8081'
    environment:
      ME_CONFIG_MONGODB_SERVER: mongodb
    depends_on: [mongodb]

volumes:
  mongo_data:
```

### Vercel Deployment
```json
// vercel.json
{
  "functions": {
    "app/api/**": { "maxDuration": 30 }
  },
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret"
  }
}
```

## 🧪 Testing Technology Stack

### Unit Testing Setup
```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts']
};

// Anomaly Detection Tests
describe('AnomalyDetection', () => {
  test('detects temperature out of range', () => {
    const result = detectAnomaly(30, 50, 'test');
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('high');
  });
});
```

### API Testing
```typescript
// Postman/Newman Test Collection
{
  "name": "PharmaTrust API Tests",
  "tests": [
    {
      "name": "Authentication",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth",
        "body": {"username": "mfg1", "password": "demo123"}
      }
    }
  ]
}
```

## 🔄 Integration Patterns

### Arduino → API Integration
```cpp
// HTTP POST with JSON payload
HTTPClient http;
http.begin("http://192.168.1.100:3000/api/iot-data");
http.addHeader("Content-Type", "application/json");

String payload = "{\"temperature\":" + String(temp) + 
                ",\"humidity\":" + String(hum) + 
                ",\"deviceId\":\"DHT22_001\"}";

int httpCode = http.POST(payload);
```

### Mobile → API Integration
```typescript
// React Native API calls
const verifyBatch = async (batchId: string) => {
  const response = await fetch(`${API_BASE}/api/medicine?action=track&batchId=${batchId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data;
};
```

### Web → Blockchain Integration
```typescript
// thirdweb NFT minting
const recordBatch = async (batchId: string, medicineData: any) => {
  const metadata = {
    name: `Medicine Batch ${batchId}`,
    description: JSON.stringify(medicineData),
    attributes: [
      { trait_type: "Batch ID", value: batchId }
    ]
  };
  
  const tx = await contract.erc721.mint(metadata);
  return tx.receipt.transactionHash;
};
```

## 🎯 Technology Selection Rationale Matrix

| Technology | Complexity | Learning Curve | Demo Value | University Fit | Selected |
|------------|------------|----------------|------------|----------------|----------|
| Next.js 14 | Low | Low | High | High | ✅ |
| MongoDB | Low | Low | High | High | ✅ |
| thirdweb | Low | Medium | High | High | ✅ |
| Arduino | Low | Low | High | High | ✅ |
| Expo RN | Low | Medium | High | High | ✅ |
| shadcn/ui | Low | Low | High | High | ✅ |

This technology context enables rapid decision-making and implementation guidance for any future development sessions.
