#!/usr/bin/env node

/**
 * PharmaTrust Database Seeding Script
 * Creates realistic demo data for all collections:
 * - Users (manufacturer, supplier, pharmacist, admin)
 * - Medicine batches with realistic pharmaceutical data
 * - Environmental data with normal and anomaly conditions
 * - Supply chain entries for complete traceability
 */

const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "pharmatrust";

// Demo user credentials (as per brief.md)
const DEMO_USERS = [
  {
    username: "mfg1",
    password: "demo123",
    role: "manufacturer",
    entityName: "PharmaCorp Manufacturing",
    location: "New York, USA",
  },
  {
    username: "sup1",
    password: "demo123",
    role: "supplier",
    entityName: "MediSupply Logistics",
    location: "Chicago, USA",
  },
  {
    username: "phm1",
    password: "demo123",
    role: "pharmacist",
    entityName: "HealthCare Pharmacy",
    location: "Los Angeles, USA",
  },
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    entityName: "PharmaTrust System Admin",
    location: "San Francisco, USA",
  },
];

// Realistic pharmaceutical products
const MEDICINE_TEMPLATES = [
  {
    name: "Aspirin 500mg",
    category: "Pain Relief",
    manufacturer: "PharmaCorp Manufacturing",
    description: "Acetylsalicylic acid tablets for pain and fever relief",
    dosage: "500mg",
    form: "Tablet",
  },
  {
    name: "Amoxicillin 250mg",
    category: "Antibiotic",
    manufacturer: "PharmaCorp Manufacturing",
    description: "Penicillin antibiotic for bacterial infections",
    dosage: "250mg",
    form: "Capsule",
  },
  {
    name: "Lisinopril 10mg",
    category: "Cardiovascular",
    manufacturer: "PharmaCorp Manufacturing",
    description: "ACE inhibitor for high blood pressure",
    dosage: "10mg",
    form: "Tablet",
  },
  {
    name: "Metformin 850mg",
    category: "Diabetes",
    manufacturer: "PharmaCorp Manufacturing",
    description: "Biguanide for type 2 diabetes management",
    dosage: "850mg",
    form: "Tablet",
  },
  {
    name: "Omeprazole 20mg",
    category: "Gastrointestinal",
    manufacturer: "PharmaCorp Manufacturing",
    description: "Proton pump inhibitor for acid reflux",
    dosage: "20mg",
    form: "Capsule",
  },
  {
    name: "Atorvastatin 40mg",
    category: "Cardiovascular",
    manufacturer: "PharmaCorp Manufacturing",
    description: "Statin for cholesterol management",
    dosage: "40mg",
    form: "Tablet",
  },
];

// Supply chain stages with realistic locations
const SUPPLY_CHAIN_STAGES = [
  {
    stage: "manufacturer",
    entityId: "mfg1",
    location: "Manufacturing Plant A - New York",
    notes: "Quality control passed, batch approved for distribution",
  },
  {
    stage: "supplier",
    entityId: "sup1",
    location: "Distribution Center - Chicago",
    notes: "Received and stored in temperature-controlled environment",
  },
  {
    stage: "pharmacist",
    entityId: "phm1",
    location: "Retail Pharmacy - Los Angeles",
    notes: "Verified authenticity, ready for dispensing",
  },
  {
    stage: "customer",
    entityId: "customer",
    location: "End Customer",
    notes: "Product dispensed to end customer",
  },
];

// Utility functions
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

function generateBatchId() {
  return `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

function generateDeviceId() {
  return `DHT22_${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
}

function getRandomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

function generateNormalReading() {
  return {
    temperature: 15 + Math.random() * 8, // 15-23°C (normal range)
    humidity: 40 + Math.random() * 20, // 40-60% (normal range)
    isAnomaly: false,
    severity: null,
  };
}

function generateAnomalyReading() {
  const anomalyType = Math.random();
  if (anomalyType < 0.4) {
    // High temperature anomaly
    return {
      temperature: 26 + Math.random() * 5, // 26-31°C
      humidity: 45 + Math.random() * 15,
      isAnomaly: true,
      severity: "high",
    };
  } else if (anomalyType < 0.7) {
    // Low temperature anomaly
    return {
      temperature: -2 + Math.random() * 3, // -2 to 1°C
      humidity: 45 + Math.random() * 15,
      isAnomaly: true,
      severity: "high",
    };
  } else {
    // Humidity anomaly
    return {
      temperature: 18 + Math.random() * 5,
      humidity:
        Math.random() < 0.5 ? 15 + Math.random() * 10 : 75 + Math.random() * 20, // <25% or >75%
      isAnomaly: true,
      severity: "medium",
    };
  }
}

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("🗑️  Clearing existing data...");
    await db.collection("users").deleteMany({});
    await db.collection("medicine_batches").deleteMany({});
    await db.collection("environmental_data").deleteMany({});

    console.log("👥 Creating demo users...");
    const users = await Promise.all(
      DEMO_USERS.map(async (user) => {
        const passwordHash = await hashPassword(user.password);
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          passwordHash,
          createdAt: new Date(),
          lastLogin: null,
          isActive: true,
        };
      }),
    );
    await db.collection("users").insertMany(users);
    console.log(`   ✅ Created ${users.length} demo users`);

    console.log("💊 Creating medicine batches...");
    const batches = [];
    const batchIds = [];

    // Create 12 batches (2 for each medicine type)
    for (let i = 0; i < MEDICINE_TEMPLATES.length; i++) {
      for (let j = 0; j < 2; j++) {
        const template = MEDICINE_TEMPLATES[i];
        const batchId = generateBatchId();
        const createdDate = getRandomDate(30); // Created within last 30 days

        // Determine current stage and quality status
        const stageIndex = Math.floor(Math.random() * 4); // 0-3
        const stages = ["manufacturer", "supplier", "pharmacist", "customer"];
        const currentStage = stages[stageIndex];

        // Quality status based on whether we'll add anomalies
        const hasAnomalies = Math.random() < 0.3; // 30% chance of anomalies
        const qualityStatus = hasAnomalies ? "compromised" : "good";

        // Build supply chain history up to current stage
        const supplyChain = [];
        for (
          let k = 0;
          k <= stageIndex && k < SUPPLY_CHAIN_STAGES.length;
          k++
        ) {
          const stageDate = new Date(createdDate);
          stageDate.setDate(stageDate.getDate() + k * 3); // 3 days between stages

          supplyChain.push({
            ...SUPPLY_CHAIN_STAGES[k],
            timestamp: stageDate.toISOString(),
          });
        }

        const batch = {
          batchId,
          name: template.name,
          category: template.category,
          description: template.description,
          dosage: template.dosage,
          form: template.form,
          manufacturerId: "mfg1",
          currentStage,
          createdAt: createdDate.toISOString(),
          blockchainHash:
            Math.random() < 0.7
              ? `0x${crypto.randomBytes(32).toString("hex")}`
              : null,
          supplyChain,
          qualityStatus,
          expiryDate: new Date(
            createdDate.getTime() + 2 * 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 2 years from creation
          lotNumber: `LOT${Date.now().toString().slice(-6)}${j}`,
          quantity: 1000 + Math.floor(Math.random() * 4000), // 1000-5000 units
        };

        batches.push(batch);
        batchIds.push(batchId);
      }
    }

    await db.collection("medicine_batches").insertMany(batches);
    console.log(`   ✅ Created ${batches.length} medicine batches`);

    console.log("🌡️  Creating environmental data...");
    const environmentalData = [];

    // Create environmental data for each batch
    for (const batchId of batchIds) {
      const batch = batches.find((b) => b.batchId === batchId);
      const batchCreated = new Date(batch.createdAt);
      const deviceId = generateDeviceId();

      // Generate 7 days of readings starting from batch creation date (every 30 minutes = 48 readings per day)
      const readingsPerDay = 48;
      const days = 7;
      const totalReadings = readingsPerDay * days;

      for (let i = 0; i < totalReadings; i++) {
        const readingDate = new Date(batchCreated);
        readingDate.setMinutes(readingDate.getMinutes() + i * 30); // Every 30 minutes

        // Determine if this should be an anomaly (higher chance for 'compromised' batches)
        const isCompromisedBatch = batch.qualityStatus === "compromised";
        const anomalyChance = isCompromisedBatch ? 0.15 : 0.05; // 15% vs 5% chance
        const shouldBeAnomaly = Math.random() < anomalyChance;

        const reading = shouldBeAnomaly
          ? generateAnomalyReading()
          : generateNormalReading();

        environmentalData.push({
          batchId,
          deviceId,
          temperature: Math.round(reading.temperature * 10) / 10, // 1 decimal place
          humidity: Math.round(reading.humidity * 10) / 10,
          timestamp: readingDate.toISOString(),
          isAnomaly: reading.isAnomaly,
          severity: reading.severity,
        });
      }
    }

    await db.collection("environmental_data").insertMany(environmentalData);
    console.log(
      `   ✅ Created ${environmentalData.length} environmental readings`,
    );

    // Create indexes for performance
    console.log("📊 Creating database indexes...");
    await db
      .collection("medicine_batches")
      .createIndex({ batchId: 1 }, { unique: true });
    await db.collection("medicine_batches").createIndex({ manufacturerId: 1 });
    await db.collection("medicine_batches").createIndex({ currentStage: 1 });
    await db
      .collection("environmental_data")
      .createIndex({ batchId: 1, timestamp: -1 });
    await db.collection("environmental_data").createIndex({ deviceId: 1 });
    await db.collection("environmental_data").createIndex({ isAnomaly: 1 });
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    console.log("   ✅ Created database indexes");

    // Print summary
    console.log("\n📋 Database Seeding Summary:");
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   💊 Medicine Batches: ${batches.length}`);
    console.log(`   🌡️  Environmental Readings: ${environmentalData.length}`);
    console.log(
      `   ⚠️  Anomalies: ${environmentalData.filter((r) => r.isAnomaly).length}`,
    );
    console.log(
      `   🔗 Blockchain Records: ${batches.filter((b) => b.blockchainHash).length}`,
    );

    console.log("\n🔑 Demo Login Credentials:");
    DEMO_USERS.forEach((user) => {
      console.log(
        `   ${user.role.padEnd(12)}: ${user.username} / ${user.password}`,
      );
    });

    console.log("\n✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the seeding script
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };
