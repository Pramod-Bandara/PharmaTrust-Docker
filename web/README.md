# PharmaTrust Web Frontend Service

This is the containerized Next.js web frontend service for the PharmaTrust pharmaceutical supply chain management system. It provides role-based dashboards for manufacturers, suppliers, pharmacists, and administrators.

## Architecture

The web frontend service is built using:
- **Next.js 14** with App Router and TypeScript
- **Tailwind CSS v4** for styling
- **shadcn/ui** components for consistent UI
- **Microservices communication** via NGINX API Gateway
- **JWT-based authentication** with role-based access control
- **Real-time IoT monitoring** with live charts and anomaly detection
- **Blockchain verification** integration for batch authenticity

## Features Implemented

### ✅ Task 6: Web Frontend Service (COMPLETED)

#### Core Infrastructure
- [x] Containerized Next.js application with Docker
- [x] API client for microservice communication via NGINX gateway
- [x] Environment-based service discovery configuration
- [x] Health checks and monitoring endpoints
- [x] Comprehensive error handling and validation
- [x] Authentication context with JWT token management

#### User Interface Components
- [x] **Navigation System**: Role-based navigation with responsive design
- [x] **Layout Components**: Dashboard layout with consistent styling
- [x] **Form Components**: Login form with demo credentials
- [x] **Error Boundary**: React error boundary for graceful error handling

#### Role-Based Dashboards

##### 1. Manufacturer Dashboard (`/manufacturer`)
- [x] Batch creation with unique ID generation
- [x] Batch management and status monitoring
- [x] Supply chain progression tracking
- [x] Quality status overview with statistics
- [x] Blockchain verification status display

##### 2. Supplier Dashboard (`/supplier`)
- [x] Real-time IoT environmental monitoring
- [x] Live temperature and humidity charts
- [x] Anomaly detection and alert system
- [x] Device status monitoring
- [x] Historical data analysis with trends

##### 3. Pharmacist Dashboard (`/pharmacist`)
- [x] Batch verification and authenticity checking
- [x] QR code scanner integration (demo mode)
- [x] Comprehensive verification reports
- [x] Supply chain traceability view
- [x] Dispensing recommendations based on verification

##### 4. Admin Dashboard (`/admin`)
- [x] System health monitoring with service status
- [x] QR code generation for medicine batches
- [x] Comprehensive batch management interface
- [x] System statistics and analytics
- [x] User management capabilities

#### Technical Features
- [x] **Service Mesh Integration**: Secure inter-service communication
- [x] **Circuit Breaker Pattern**: Fault tolerance for service failures
- [x] **Retry Mechanisms**: Exponential backoff for failed requests
- [x] **Performance Monitoring**: Response time tracking and metrics
- [x] **Input Validation**: Comprehensive data sanitization and validation
- [x] **Error Logging**: Structured logging for debugging and monitoring

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- Access to PharmaTrust microservices (auth, medicine, iot, blockchain)

### Environment Setup

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Configure environment variables in `.env.local`:
```env
# MongoDB connection
MONGODB_URI=mongodb://mongo:27017/pharmatrust
MONGODB_DB=pharmatrust

# API Gateway URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:80

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Docker Deployment

Build and run with Docker:
```bash
docker build -t pharmatrust-web .
docker run -p 3000:3000 pharmatrust-web
```

Or use Docker Compose (from project root):
```bash
docker-compose up web
```

## Demo Credentials

The system includes demo credentials for testing:

- **Manufacturer**: `mfg1` / `demo123`
- **Supplier**: `sup1` / `demo123`
- **Pharmacist**: `phm1` / `demo123`
- **Admin**: `admin` / `admin123`

## API Integration

The frontend communicates with backend microservices through:

### Service Endpoints
- **Auth Service**: `/api/auth/*` → `http://auth:4001`
- **Medicine Service**: `/api/medicine/*` → `http://medicine:4002`
- **IoT Service**: `/api/iot/*` → `http://iot:4003`
- **Blockchain Service**: `/api/blockchain/*` → `http://blockchain:4004`

### Key Features
- Automatic token management and refresh
- Request/response interceptors for error handling
- Circuit breaker pattern for service failures
- Retry mechanisms with exponential backoff

## File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard
│   ├── manufacturer/      # Manufacturer dashboard
│   ├── pharmacist/        # Pharmacist dashboard
│   ├── supplier/          # Supplier dashboard
│   └── api/health/        # Health check endpoint
├── components/            # Reusable UI components
│   ├── admin/            # Admin-specific components
│   ├── common/           # Shared components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   ├── manufacturer/     # Manufacturer components
│   ├── pharmacist/       # Pharmacist components
│   ├── supplier/         # Supplier components
│   └── ui/               # shadcn/ui components
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── lib/                  # Utility libraries
│   ├── api-client.ts     # API client for microservices
│   ├── config.ts         # Configuration and service discovery
│   ├── error-handling.ts # Error handling utilities
│   ├── health-check.ts   # Health monitoring utilities
│   ├── mongodb.ts        # MongoDB connection utility
│   └── utils.ts          # General utilities
└── types/                # TypeScript type definitions
    └── index.ts          # Shared types
```

## Monitoring and Health Checks

### Health Endpoint
- **URL**: `/api/health`
- **Method**: GET
- **Response**: Service status, uptime, memory usage

### System Monitoring
- Real-time service health dashboard
- Performance metrics tracking
- Error rate monitoring
- Circuit breaker status

## Security Features

- JWT-based authentication with automatic token refresh
- Role-based access control (RBAC)
- Input validation and sanitization
- XSS protection through React's built-in mechanisms
- CSRF protection for state-changing operations

## Performance Optimizations

- Server-side rendering (SSR) for initial page loads
- Client-side routing for seamless navigation
- Component lazy loading for reduced bundle size
- Image optimization with Next.js Image component
- Caching strategies for API responses

## Error Handling

- React Error Boundaries for component-level errors
- Global error handling for API requests
- User-friendly error messages
- Automatic retry mechanisms for transient failures
- Comprehensive logging for debugging

## Next Steps

Task 6 is now **COMPLETE**. The web frontend service provides:

1. ✅ **Containerized Next.js Application**: Ready for deployment
2. ✅ **API Gateway Integration**: Seamless microservice communication
3. ✅ **Service Mesh Configuration**: Secure inter-service calls
4. ✅ **Role-Based Dashboards**: Complete UI for all user types
5. ✅ **Health Monitoring**: System status and performance tracking
6. ✅ **Error Handling**: Comprehensive error management
7. ✅ **Zero Lint/Build/Type Errors**: Production-ready codebase

The system is ready for integration with Tasks 7-17 which will build upon this foundation to create the complete PharmaTrust pharmaceutical supply chain management system.
