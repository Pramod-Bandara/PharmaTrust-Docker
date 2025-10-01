import { database } from './database.js';
import { MedicineBatch, User, EnvironmentalData } from './types.js';
import { generateBatchId } from './utils.js';

// Demo users for testing
const demoUsers: User[] = [
  {
    username: 'mfg1',
    password: 'demo123', // In production, this would be hashed
    role: 'manufacturer',
    name: 'PharmaCorp Manufacturing',
    email: 'mfg1@pharmacorp.com',
    organization: 'PharmaCorp Ltd.',
    createdAt: new Date(),
  },
  {
    username: 'sup1',
    password: 'demo123',
    role: 'supplier',
    name: 'MedSupply Distribution',
    email: 'sup1@medsupply.com',
    organization: 'MedSupply Inc.',
    createdAt: new Date(),
  },
  {
    username: 'phm1',
    password: 'demo123',
    role: 'pharmacist',
    name: 'CityPharm Pharmacy',
    email: 'phm1@citypharm.com',
    organization: 'CityPharm Chain',
    createdAt: new Date(),
  },
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'System Administrator',
    email: 'admin@pharmatrust.com',
    organization: 'PharmaTrust System',
    createdAt: new Date(),
  }
];

// Demo medicine batches
function createDemoBatches(): MedicineBatch[] {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  return [
    {
      batchId: generateBatchId(),
      name: 'Aspirin 500mg',
      description: 'Pain relief medication',
      medicineType: 'Analgesic',
      dosage: '500mg',
      expiryDate: new Date('2025-12-31'),
      quantity: 1000,
      unit: 'tablets',
      manufacturerId: 'mfg1',
      manufacturerName: 'PharmaCorp Manufacturing',
      currentStage: 'supplier',
      qualityStatus: 'good',
      supplyChain: [
        {
          stage: 'manufacturer',
          timestamp: twoHoursAgo,
          handledBy: 'mfg1',
          notes: 'Batch created and quality tested'
        },
        {
          stage: 'supplier',
          timestamp: oneHourAgo,
          handledBy: 'sup1',
          location: 'Warehouse A',
          notes: 'Received and stored in controlled environment'
        }
      ],
      qualityAlerts: [],
      createdAt: twoHoursAgo,
      updatedAt: oneHourAgo
    },
    {
      batchId: generateBatchId(),
      name: 'Amoxicillin 250mg',
      description: 'Antibiotic medication',
      medicineType: 'Antibiotic',
      dosage: '250mg',
      expiryDate: new Date('2025-06-30'),
      quantity: 500,
      unit: 'capsules',
      manufacturerId: 'mfg1',
      manufacturerName: 'PharmaCorp Manufacturing',
      currentStage: 'manufacturer',
      qualityStatus: 'good',
      supplyChain: [
        {
          stage: 'manufacturer',
          timestamp: oneHourAgo,
          handledBy: 'mfg1',
          notes: 'Batch created and awaiting quality control'
        }
      ],
      qualityAlerts: [],
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo
    },
    {
      batchId: generateBatchId(),
      name: 'Insulin Rapid-Acting',
      description: 'Diabetes medication',
      medicineType: 'Hormone',
      dosage: '100 units/ml',
      expiryDate: new Date('2025-03-15'),
      quantity: 50,
      unit: 'vials',
      manufacturerId: 'mfg1',
      manufacturerName: 'PharmaCorp Manufacturing',
      currentStage: 'pharmacist',
      qualityStatus: 'compromised',
      supplyChain: [
        {
          stage: 'manufacturer',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          handledBy: 'mfg1',
          notes: 'Batch created with temperature monitoring'
        },
        {
          stage: 'supplier',
          timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          handledBy: 'sup1',
          location: 'Cold Storage Unit B',
          notes: 'Stored in refrigerated environment'
        },
        {
          stage: 'pharmacist',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000),
          handledBy: 'phm1',
          location: 'CityPharm Main Branch',
          notes: 'Received for dispensing'
        }
      ],
      qualityAlerts: [
        {
          id: `ALERT_${Date.now()}_temp1`,
          type: 'temperature',
          severity: 'high',
          message: 'Temperature exceeded safe range (28°C detected, max 25°C)',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          resolved: false
        }
      ],
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 30 * 60 * 1000)
    }
  ];
}

// Demo environmental data
function createDemoEnvironmentalData(batches: MedicineBatch[]): EnvironmentalData[] {
  const data: EnvironmentalData[] = [];
  const now = new Date();

  batches.forEach(batch => {
    // Create 20 data points for each batch over the last 2 hours
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - (i * 6 * 60 * 1000)); // Every 6 minutes
      
      // Generate realistic temperature and humidity data
      let temperature = 20 + Math.random() * 8; // 20-28°C range
      let humidity = 45 + Math.random() * 20; // 45-65% range
      
      // Add some anomalies for the insulin batch (compromised quality)
      if (batch.name === 'Insulin Rapid-Acting' && i < 5) {
        temperature = 26 + Math.random() * 4; // 26-30°C (too high)
        humidity = 75 + Math.random() * 10; // 75-85% (too high)
      }

      const isAnomaly = temperature > 25 || temperature < 2 || humidity > 70 || humidity < 30;
      let severity: 'low' | 'medium' | 'high' = 'low';
      
      if (temperature > 25 || temperature < 2) severity = 'high';
      else if (humidity > 70 || humidity < 30) severity = 'medium';

      data.push({
        batchId: batch.batchId,
        deviceId: 'DHT22_001',
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
        timestamp,
        isAnomaly,
        severity: isAnomaly ? severity : undefined,
        anomalyReason: isAnomaly ? 
          `Temperature: ${temperature.toFixed(1)}°C, Humidity: ${humidity.toFixed(1)}%` : 
          undefined
      });
    }
  });

  return data;
}

// Seed the database
export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await database.users.deleteMany({});
    await database.medicineBatches.deleteMany({});
    await database.environmentalData.deleteMany({});

    // Insert demo users
    console.log('👥 Inserting demo users...');
    await database.users.insertMany(demoUsers);

    // Insert demo batches
    console.log('💊 Inserting demo medicine batches...');
    const demoBatches = createDemoBatches();
    await database.medicineBatches.insertMany(demoBatches);

    // Insert demo environmental data
    console.log('🌡️ Inserting demo environmental data...');
    const demoEnvironmentalData = createDemoEnvironmentalData(demoBatches);
    await database.environmentalData.insertMany(demoEnvironmentalData);

    console.log('✅ Database seeding completed successfully!');
    console.log(`   - ${demoUsers.length} users created`);
    console.log(`   - ${demoBatches.length} medicine batches created`);
    console.log(`   - ${demoEnvironmentalData.length} environmental data points created`);
    
    console.log('\n🔑 Demo user credentials:');
    demoUsers.forEach(user => {
      console.log(`   - ${user.role}: ${user.username}/${user.password}`);
    });

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  database.connect()
    .then(() => seedDatabase())
    .then(() => database.disconnect())
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
