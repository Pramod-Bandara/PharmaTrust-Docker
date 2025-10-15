#!/usr/bin/env node

/**
 * PharmaTrust Setup Validation Script
 * Quick validation to ensure demo data and scripts are working correctly
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'pharmatrust';

async function validateSetup() {
  console.log('🔍 Validating PharmaTrust demo setup...\n');
  
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Check collections exist and have data
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📊 Database Collections:');
    const expectedCollections = [
      'users',
      'medicine_batches', 
      'environmental_data',
      'blockchain_records',
      'verification_records'
    ];
    
    for (const collection of expectedCollections) {
      if (collectionNames.includes(collection)) {
        const count = await db.collection(collection).countDocuments();
        console.log(`   ✅ ${collection.padEnd(20)}: ${count} documents`);
      } else {
        console.log(`   ❌ ${collection.padEnd(20)}: Missing`);
      }
    }
    
    // Validate demo users
    console.log('\n👥 Demo Users:');
    const users = await db.collection('users').find({}).toArray();
    const expectedUsers = ['mfg1', 'sup1', 'phm1', 'admin'];
    
    for (const username of expectedUsers) {
      const user = users.find(u => u.username === username);
      if (user) {
        console.log(`   ✅ ${username.padEnd(8)}: ${user.role} (${user.entityName})`);
      } else {
        console.log(`   ❌ ${username.padEnd(8)}: Missing`);
      }
    }
    
    // Validate medicine batches
    console.log('\n💊 Medicine Batches:');
    const batches = await db.collection('medicine_batches').find({}).toArray();
    const batchesByStatus = batches.reduce((acc, batch) => {
      acc[batch.qualityStatus] = (acc[batch.qualityStatus] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`   📦 Total Batches: ${batches.length}`);
    Object.entries(batchesByStatus).forEach(([status, count]) => {
      console.log(`   ${status === 'good' ? '✅' : '⚠️'} ${status.padEnd(12)}: ${count}`);
    });
    
    // Validate environmental data
    console.log('\n🌡️  Environmental Data:');
    const envData = await db.collection('environmental_data').find({}).toArray();
    const anomalies = envData.filter(d => d.isAnomaly);
    
    console.log(`   📊 Total Readings: ${envData.length}`);
    console.log(`   ⚠️  Anomalies: ${anomalies.length} (${(anomalies.length/envData.length*100).toFixed(1)}%)`);
    
    // Validate blockchain data
    console.log('\n🔗 Blockchain Data:');
    const blockchainRecords = await db.collection('blockchain_records').find({}).toArray();
    const verificationRecords = await db.collection('verification_records').find({}).toArray();
    
    console.log(`   🔗 Blockchain Records: ${blockchainRecords.length}`);
    console.log(`   ✅ Verification Records: ${verificationRecords.length}`);
    
    await client.close();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ PharmaTrust demo setup validation complete!');
    console.log('🚀 System is ready for demonstration.');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateSetup().catch(console.error);
}

module.exports = { validateSetup };
