# PharmaTrust System Design Document

## Overview

PharmaTrust is a comprehensive pharmaceutical supply chain management system that leverages IoT sensors, blockchain technology, and machine learning to ensure medicine authenticity, quality, and traceability from manufacturer to end consumer. The system addresses critical challenges in pharmaceutical supply chains including counterfeit drugs, temperature excursions, and lack of transparency.

Note on scope: This is a non-production, university project. The design intentionally prioritizes simplicity, minimal code, and fast demos over enterprise-grade robustness. Advanced security, scalability, and compliance are out of scope beyond basic best practices.

### System Goals
- **Traceability**: Complete end-to-end tracking of pharmaceutical products through the supply chain
- **Quality Assurance**: Real-time environmental monitoring with automated anomaly detection
- **Authentication**: Blockchain-based verification to prevent counterfeit medicines
- **Compliance**: Adherence to FDA DSCSA, GxP regulations, and international pharmaceutical standards
- **Transparency**: Multi-stakeholder visibility into product journey and quality status

### Key Stakeholders
- **Manufacturers**: Create and track medicine batches, monitor production quality
- **Suppliers/Distributors**: Monitor environmental conditions during storage and transport
- **Pharmacists**: Verify medicine authenticity and quality before dispensing
- **Customers**: Authenticate medicines using mobile verification
- **Regulators**: Access audit trails and compliance reports

## Architecture

### System Architecture Overview

The PharmaTrust system follows a Docker-based microservices architecture with the following key principles:

- **Microservices Architecture**: Separate, independently deployable services (auth, medicine, iot, blockchain, web)
- **API Gateway**: NGINX or a lightweight gateway routes external requests to backend services
- **Event-Driven Design**: Real-time IoT data processing with anomaly detection via a message broker (Redis/RabbitMQ)
- **Blockchain Integration**: Dedicated blockchain service using thirdweb for immutable records
- **Mobile-First**: Simple single-page mobile app; an optional mobile API gateway optimizes mobile responses

```mermaid
flowchart TB
    subgraph "IoT Layer"
        A[Arduino DHT22 Sensors] --> B[HTTP Client]
    end

    subgraph "Edge / Gateway"
        GW[NGINX API Gateway]
    end

    subgraph "Services"
        WEB[Web Frontend (Next.js)]
        AUTH[Auth Service]
        MED[Medicine Service]
        IOT[IoT Service]
        BC[Blockchain Service]
        MQ[(Redis/RabbitMQ)]
    end

    subgraph "Data Layer"
        DB[(MongoDB)]
        CHAIN[(Blockchain Network)]
        CACHE[(Redis Cache)]
    end

    subgraph "Mobile Layer"
        RN[React Native App]
    end

    B -->|POST /readings| IOT
    IOT <--> MQ
    IOT --> DB
    IOT --> MED
    MED --> DB
    AUTH --> DB
    WEB --> GW
    RN --> GW
    GW --> AUTH
    GW --> MED
    GW --> IOT
    GW --> BC
    BC --> CHAIN
    AUTH --> CACHE

```

### Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Frontend** | Next.js 14 (containerized) | Modern React framework, deployed as its own service |
| **API Gateway** | NGINX (container) | Central ingress, routing, rate limiting, TLS termination |
| **Backend Services** | Node.js/Express (Auth, Medicine, IoT, Blockchain) | Clear separation of concerns, independent scaling |
| **Database** | MongoDB | Flexible document DB for IoT and supply chain records |
| **Cache/Queues** | Redis (cache) and Redis/RabbitMQ (broker) | Caching, pub/sub, and event-driven workflows |
| **Authentication** | JWT | Stateless tokens across services |
| **Blockchain** | thirdweb SDK on Polygon | Low-cost, fast blockchain integration |
| **IoT Hardware** | Arduino + DHT22 | Reliable sensing for demo |
| **Mobile** | React Native (Expo) | Simple QR verification client |
| **Containerization** | Docker + Docker Compose | Local multi-service development and orchestration |
| **Orchestration (opt.)** | Kubernetes | Production-grade scaling and resilience |

## Components and Interfaces

### Core Components

#### 1. Authentication Service (`/lib/auth.ts`)

**Purpose**: Manages user authentication and authorization across different stakeholder roles.

**Key Functions**:
- `signToken(userId: string, role: string)`: Creates JWT tokens with role-based claims
- `verifyToken(token: string)`: Validates and decodes JWT tokens
- Role-based access control for manufacturers, suppliers, pharmacists, and admins

**Interface**:
```typescript
interface AuthService {
  signToken(userId: string, role: string): string;
  verifyToken(token: string): { userId: string; role: string } | null;
}

interface User {
  _id: string;
  username: string;
  role: 'manufacturer' | 'supplier' | 'pharmacist' | 'admin';
  entityName: string;
}
```

#### 2. Medicine Management Service (`/app/api/medicine/route.ts`)

**Purpose**: Handles CRUD operations for medicine batches and supply chain tracking.

**Key Functions**:
- Create new medicine batches with unique identifiers
- Track batch movement through supply chain stages
- Update batch status and quality indicators
- Retrieve batch history and current status

**Interface**:
```typescript
interface MedicineBatch {
  _id: string;
  batchId: string;
  name: string;
  manufacturerId: string;
  currentStage: 'manufacturer' | 'supplier' | 'pharmacist' | 'customer';
  createdAt: Date;
  blockchainHash?: string;
  supplyChain: SupplyChainEntry[];
  qualityStatus: 'good' | 'compromised' | 'unknown';
}

interface SupplyChainEntry {
  stage: string;
  entityId: string;
  timestamp: Date;
  location: string;
  notes?: string;
}
```

#### 3. IoT Data Handler (`/app/api/iot-data/route.ts`)

**Purpose**: Processes real-time environmental data from IoT sensors and triggers anomaly detection.

**Key Functions**:
- Receive temperature and humidity data from Arduino sensors
- Execute anomaly detection algorithms
- Store environmental data with anomaly flags
- Update medicine quality status based on environmental conditions
- Provide real-time data feeds for monitoring dashboards

**Interface**:
```typescript
interface EnvironmentalData {
  _id: string;
  batchId: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  timestamp: Date;
  isAnomaly: boolean;
  severity?: 'low' | 'medium' | 'high';
}

interface IoTDataHandler {
  processReading(data: EnvironmentalReading): Promise<AnomalyResult>;
  getHistoricalData(batchId: string, limit?: number): Promise<EnvironmentalData[]>;
}
```

#### 4. Anomaly Detection Engine (`/lib/anomaly-detection.ts`)

**Purpose**: Implements machine learning algorithms to detect environmental anomalies that could compromise medicine quality.

**Detection Methods**:
- **Range-based Detection**: Monitors temperature (2-25°C) and humidity (30-70%) thresholds
- **Rate-of-change Detection**: Identifies sudden environmental changes that indicate equipment failure
- **Statistical Analysis**: Uses historical data patterns to identify deviations
- **Severity Classification**: Categorizes anomalies as low, medium, or high priority

**Interface**:
```typescript
interface AnomalyDetector {
  detectAnomaly(temperature: number, humidity: number, deviceId: string): AnomalyResult;
}

interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  reasons: {
    temperature: boolean;
    humidity: boolean;
    suddenChange: boolean;
  };
  details: {
    currentTemp: number;
    currentHumidity: number;
    tempRange: { min: number; max: number };
    humidityRange: { min: number; max: number };
  };
}
```

#### 5. Blockchain Service (`/lib/blockchain.ts`)

**Purpose**: Manages blockchain interactions for immutable record keeping and medicine authentication.

**Key Functions**:
- Record medicine batch creation on blockchain as NFTs
- Verify batch authenticity through blockchain queries
- Store supply chain events as immutable records
- Enable customer verification of medicine authenticity

**Interface**:
```typescript
interface BlockchainService {
  init(): Promise<void>;
  recordBatch(batchId: string, medicineData: MedicineBatch): Promise<string | null>;
  verifyBatch(batchId: string): Promise<VerificationResult>;
}

interface VerificationResult {
  isVerified: boolean;
  blockchainData?: any;
  error?: string;
}
```

### Dashboard Components

#### 1. Manufacturer Dashboard (`/app/manufacturer/page.tsx`)

**Features**:
- Create new medicine batches with batch ID generation
- View all manufactured batches with status indicators
- Monitor batch progression through supply chain
- Quality status overview with anomaly alerts

#### 2. Supplier Dashboard (`/app/supplier/page.tsx`)

**Features**:
- Real-time environmental monitoring with live charts
- Temperature and humidity trend visualization
- Anomaly alert system with severity indicators
- Historical data analysis for compliance reporting

#### 3. Pharmacist Dashboard (`/app/pharmacist/page.tsx`)

**Features**:
- Batch verification and authenticity checking
- Quality assessment based on environmental history
- Supply chain transparency with full traceability
- Compliance reporting for regulatory requirements

#### 4. Admin Dashboard (`/app/admin/page.tsx`)

**Features**:
- Generate QR codes for medicine batches (encode `batchId` and deep-link/URL)
- Create/list batches and view basic status (quality, stage)
- Minimal role management (optional for demo)
- Lightweight system overview (optional)

### Mobile Application (`/mobile/App.tsx`)

**Purpose**: Single-page QR scanner for end-user batch verification.

**Key Features**:
- Scan QR to extract `batchId` and call `/api/medicine?action=track&batchId=...`
- Call `/api/blockchain` to verify authenticity (demo mode acceptable)
- Display a simple status card: "Authentic" or "Suspicious" with minimal batch details
- No login, no persistence; single view for fastest demo

## Data Models

### Database Schema Design

The system uses MongoDB for flexible document storage with the following collections:

#### 1. Medicine Batches Collection
```javascript
{
  _id: ObjectId,
  batchId: "BATCH_1234567890",
  name: "Aspirin 500mg",
  manufacturerId: "mfg1",
  currentStage: "supplier",
  createdAt: ISODate,
  blockchainHash: "0x1234...abcd",
  supplyChain: [
    {
      stage: "manufacturer",
      entityId: "mfg1",
      timestamp: ISODate,
      location: "Manufacturing Plant A",
      notes: "Quality control passed"
    }
  ],
  qualityStatus: "good"
}
```

#### 2. Environmental Data Collection
```javascript
{
  _id: ObjectId,
  batchId: "BATCH_1234567890",
  deviceId: "DHT22_001",
  temperature: 22.5,
  humidity: 45.2,
  timestamp: ISODate,
  isAnomaly: false,
  severity: null
}
```

#### 3. Users Collection
```javascript
{
  _id: ObjectId,
  username: "mfg1",
  passwordHash: "hashed_password",
  role: "manufacturer",
  entityName: "PharmaCorp Manufacturing",
  createdAt: ISODate,
  lastLogin: ISODate
}
```

### Blockchain Data Model

Medicine batches are represented as NFTs on the blockchain with metadata:

```javascript
{
  name: "Medicine Batch BATCH_1234567890",
  description: JSON.stringify(medicineData),
  attributes: [
    { trait_type: "Batch ID", value: "BATCH_1234567890" },
    { trait_type: "Manufacturer", value: "mfg1" },
    { trait_type: "Created", value: "2024-01-15T10:30:00Z" },
    { trait_type: "Medicine Name", value: "Aspirin 500mg" }
  ]
}
```

## Error Handling

### Error Handling Strategy

The system implements comprehensive error handling across all layers:

#### 1. API Error Handling
- **Authentication Errors**: 401 Unauthorized for invalid tokens
- **Authorization Errors**: 403 Forbidden for insufficient permissions
- **Validation Errors**: 400 Bad Request for invalid input data
- **Not Found Errors**: 404 for non-existent resources
- **Server Errors**: 500 Internal Server Error with sanitized error messages

#### 2. IoT Data Error Handling
- **Sensor Failures**: Graceful handling of invalid sensor readings
- **Network Connectivity**: Retry mechanisms for failed HTTP requests
- **Data Validation**: Input sanitization and range checking
- **Anomaly Processing**: Fallback to basic threshold detection if ML fails

#### 3. Blockchain Error Handling
- **Network Issues**: Retry logic for blockchain transactions
- **Gas Estimation**: Automatic gas price adjustment
- **Transaction Failures**: Graceful degradation with local storage backup
- **Smart Contract Errors**: Error logging and user notification

#### 4. Database Error Handling
- **Connection Failures**: Connection pooling and retry mechanisms
- **Query Errors**: Input validation and sanitization
- **Data Integrity**: Transaction rollback for critical operations
- **Performance Issues**: Query optimization and indexing

### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}
```

## Testing Strategy

### Lean Testing Approach (non-production)

Focus on a minimal, fast feedback loop suitable for demos:

- **Unit tests (a few)**: anomaly detection thresholds and rate-of-change logic in `lib/anomaly-detection.ts`.
- **API smoke tests**: basic happy-path for `/api/auth`, `/api/medicine` (create+list), `/api/iot-data` (POST), `/api/blockchain` (verify).
- **Single E2E flow**: create batch → generate QR → scan on mobile → verify authenticity.
- Manual exploratory testing is acceptable; no performance or security testing beyond basics.

## Implementation Considerations

### Simplified Non-Production Posture

- Keep configs minimal (.env.local only for local dev).
- Basic input validation and JWT-based auth for demos; avoid advanced RBAC.
- Optional blockchain: use thirdweb on a testnet or mock locally if unavailable.
- Logging via console and simple alerts; no centralized monitoring.
- Single-step deployment (e.g., Vercel) when needed; no staging/prod segregation required for coursework.
