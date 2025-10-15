# PharmaTrust Demo Data & Testing Scripts

This directory contains comprehensive demo data generation and testing utilities for the PharmaTrust pharmaceutical supply chain management system.

## 🚀 Quick Start

```bash
# Install dependencies
cd scripts
npm install

# Complete demo setup (recommended)
npm run setup

# Or run individual components
npm run seed        # Seed database with demo data
npm run blockchain  # Generate blockchain demo data
npm run test        # Run automated workflow tests

# Firebase authentication setup
npm run firebase:validate  # Validate Firebase configuration
npm run firebase:help      # Show Firebase setup help
```

## 📁 Scripts Overview

### 🌱 `seed-database.js`
Creates realistic demo data for all MongoDB collections:
- **4 Demo Users**: manufacturer, supplier, pharmacist, admin with predefined credentials
- **12 Medicine Batches**: Realistic pharmaceutical products (Aspirin, Amoxicillin, etc.)
- **2000+ Environmental Readings**: Temperature/humidity data with normal and anomaly conditions
- **Supply Chain History**: Complete traceability through all stages

**Usage:**
```bash
node seed-database.js
# or
npm run seed
```

### 🔗 `blockchain-demo-data.js`
Generates mock blockchain records for demonstration:
- **NFT Metadata**: Complete medicine batch information as blockchain NFTs
- **Transaction Records**: Mock Polygon Mumbai testnet transactions
- **Verification Data**: Batch authenticity verification records
- **Supply Chain Events**: Blockchain-recorded stage transitions

**Usage:**
```bash
node blockchain-demo-data.js
# or
npm run blockchain
```

### 🧪 `test-workflows.js`
Comprehensive automated testing of all system workflows:
- **Authentication Testing**: All user roles and permissions
- **Batch Management**: Creation, retrieval, and updates
- **Environmental Data**: IoT data submission and anomaly detection
- **Supply Chain**: Stage progression and tracking
- **Blockchain Integration**: Recording and verification
- **QR Code Generation**: Admin QR code functionality

**Usage:**
```bash
node test-workflows.js
# or
npm run test
```

### 🎯 `setup-demo.js`
Complete demo environment orchestration:
- Runs database seeding
- Generates blockchain demo data
- Validates system health
- Displays demo credentials and usage instructions

**Usage:**
```bash
node setup-demo.js
# or
npm run setup
```

## 📊 Generated Demo Data

### Users (4 accounts)
| Role | Username | Password | Entity Name |
|------|----------|----------|-------------|
| Manufacturer | `mfg1` | `demo123` | PharmaCorp Manufacturing |
| Supplier | `sup1` | `demo123` | MediSupply Logistics |
| Pharmacist | `phm1` | `demo123` | HealthCare Pharmacy |
| Admin | `admin` | `admin123` | PharmaTrust System Admin |

### Medicine Batches (12 realistic batches)
- **Aspirin 500mg** - Pain Relief
- **Amoxicillin 250mg** - Antibiotic
- **Lisinopril 10mg** - Cardiovascular
- **Metformin 850mg** - Diabetes
- **Omeprazole 20mg** - Gastrointestinal
- **Atorvastatin 40mg** - Cardiovascular

Each medicine has 2 batches with:
- Unique batch IDs (`BATCH_timestamp_XXXXX`)
- Complete supply chain history
- Environmental monitoring data
- Quality status (good/compromised)
- Blockchain verification (80% of batches)

### Environmental Data
- **2000+ readings** across all batches
- **30-minute intervals** for realistic monitoring
- **Normal conditions**: 15-23°C, 40-60% humidity
- **Anomaly conditions**: Temperature extremes, humidity issues
- **Severity levels**: Low, Medium, High
- **Quality impact**: Automatic quality status updates

### Blockchain Records
- **Mock NFT metadata** for each batch
- **Transaction hashes** and block numbers
- **Polygon Mumbai testnet** simulation
- **Supply chain events** on blockchain
- **Verification records** for authenticity checking

## 🛠️ Available NPM Scripts

```bash
# Individual operations
npm run seed        # Seed database only
npm run blockchain  # Generate blockchain data only
npm run test        # Run tests only

# Combined operations
npm run setup       # Complete demo setup (seed + blockchain + validation)
npm run full-setup  # Full setup with comprehensive testing
npm run seed-and-test # Seed database then run tests

# Maintenance
npm run clean       # Clear all demo data
npm run reset       # Clean and setup fresh demo environment
```

## 🎪 5-Minute Demo Flow

1. **Manufacturer Dashboard** (`mfg1/demo123`)
   - View existing batches with quality status
   - Create new medicine batch
   - Monitor batch progression

2. **Supplier Dashboard** (`sup1/demo123`)
   - Real-time environmental monitoring charts
   - Anomaly alerts and severity indicators
   - Historical data analysis

3. **Admin Dashboard** (`admin/admin123`)
   - Generate QR codes for batch verification
   - System overview and statistics
   - User management interface

4. **Mobile QR Scanner**
   - Scan generated QR codes
   - Verify batch authenticity
   - View basic batch information

5. **Pharmacist Dashboard** (`phm1/demo123`)
   - Complete supply chain traceability
   - Batch verification and quality assessment
   - Compliance reporting

## 🔧 Configuration

### Environment Variables
```bash
# MongoDB connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=pharmatrust

# API testing endpoint
API_BASE_URL=http://localhost:3000
```

### MongoDB Collections Created
- `users` - Demo user accounts
- `medicine_batches` - Medicine batch records
- `environmental_data` - IoT sensor readings
- `blockchain_records` - Mock blockchain NFT data
- `verification_records` - Batch verification data
- `supply_chain_events` - Blockchain supply chain events

## 🚨 Troubleshooting

### MongoDB Connection Issues
```bash
# Start MongoDB service
brew services start mongodb-community

# Verify connection
mongo --eval "db.adminCommand('ismaster')"
```

### Missing Dependencies
```bash
# Install all dependencies
npm install

# Individual packages
npm install mongodb axios
```

### Test Failures
```bash
# Ensure services are running
cd ../web && npm run dev

# Check MongoDB is accessible
npm run clean && npm run seed
```

### Reset Demo Environment
```bash
# Complete reset
npm run reset

# Manual cleanup
npm run clean
npm run setup
```

## 📈 Test Coverage

The automated tests cover:
- ✅ Authentication (all roles)
- ✅ Medicine batch CRUD operations
- ✅ Environmental data processing
- ✅ Anomaly detection algorithms
- ✅ Supply chain progression
- ✅ Blockchain integration (mock)
- ✅ QR code generation
- ✅ User management (admin)
- ✅ System health checks

## 🎯 Success Metrics

After running the setup, you should have:
- **4 demo user accounts** ready for login
- **12 realistic medicine batches** with complete data
- **2000+ environmental readings** with anomalies
- **Blockchain verification** for 80% of batches
- **Complete supply chain history** for all batches
- **Zero linting/build errors** in the system
- **100% test pass rate** for core workflows

### 🔥 `validate-firebase.js`
Validates Firebase authentication configuration and tests connectivity:
- **Environment Variables**: Checks all required Firebase config variables
- **Service Account**: Validates Firebase Admin SDK credentials
- **Connection Test**: Tests actual Firebase Admin SDK connection
- **Setup Instructions**: Provides detailed Firebase setup guidance

**Usage:**
```bash
# Basic validation
npm run firebase:validate

# Show help
npm run firebase:help

# With environment loaded
source .env && npm run firebase:validate
```

## 📝 Notes

- This is demo data for **non-production use only**
- Blockchain integration uses **mock data** for demonstration
- Environmental anomalies are **artificially generated** for testing
- All passwords are **demo credentials** - not for production use
- System designed for **university project demonstration**
- **Firebase authentication** available for production-like experience

---

**Ready to demo PharmaTrust!** 🎉

Run `npm run setup` and follow the displayed instructions to start your pharmaceutical supply chain demonstration.
