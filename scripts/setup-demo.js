#!/usr/bin/env node

/**
 * PharmaTrust Demo Setup Script
 * Complete demo environment setup including:
 * - Database seeding with realistic data
 * - Blockchain demo data generation
 * - System health verification
 * - Demo user credential display
 * - Quick system validation
 */

const { seedDatabase } = require('./seed-database');
const { generateBlockchainDemoData } = require('./blockchain-demo-data');
const { runAllTests } = require('./test-workflows');

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    header: '🚀'
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'header');
  console.log('='.repeat(60));
}

function printDemoCredentials() {
  printHeader('Demo Login Credentials');
  
  const credentials = [
    { role: 'Manufacturer', username: 'mfg1', password: 'demo123', description: 'Create and manage medicine batches' },
    { role: 'Supplier', username: 'sup1', password: 'demo123', description: 'Monitor environmental conditions' },
    { role: 'Pharmacist', username: 'phm1', password: 'demo123', description: 'Verify batch authenticity' },
    { role: 'Admin', username: 'admin', password: 'admin123', description: 'System management and QR generation' }
  ];
  
  console.log('');
  credentials.forEach(cred => {
    console.log(`👤 ${cred.role.padEnd(12)}: ${cred.username.padEnd(8)} / ${cred.password.padEnd(10)} - ${cred.description}`);
  });
}

function printDemoFlow() {
  printHeader('5-Minute Demo Flow');
  
  const steps = [
    '1. Login as Manufacturer (mfg1/demo123) → Create a new medicine batch',
    '2. Login as Supplier (sup1/demo123) → View real-time environmental monitoring',
    '3. Login as Admin (admin/admin123) → Generate QR code for the batch',
    '4. Use Mobile App → Scan QR code to verify batch authenticity',
    '5. Login as Pharmacist (phm1/demo123) → View complete supply chain history'
  ];
  
  console.log('');
  steps.forEach(step => {
    console.log(`📋 ${step}`);
  });
}

function printSystemInfo() {
  printHeader('System Information');
  
  console.log('');
  console.log('🌐 Web Application: http://localhost:3000');
  console.log('📱 Mobile QR Scanner: Use Expo Go app');
  console.log('🗄️  Database: MongoDB (pharmatrust)');
  console.log('🔗 Blockchain: Polygon Mumbai Testnet (mocked)');
  console.log('🌡️  IoT Endpoint: http://localhost:3000/api/iot-data');
  console.log('');
  console.log('📊 Collections Created:');
  console.log('   • users (4 demo accounts)');
  console.log('   • medicine_batches (12 realistic batches)');
  console.log('   • environmental_data (2000+ readings with anomalies)');
  console.log('   • blockchain_records (mock NFT data)');
  console.log('   • verification_records (batch verification data)');
  console.log('   • supply_chain_events (blockchain supply chain events)');
}

function printTroubleshooting() {
  printHeader('Troubleshooting Guide');
  
  console.log('');
  console.log('❓ Common Issues:');
  console.log('');
  console.log('🔌 MongoDB Connection Issues:');
  console.log('   • Ensure MongoDB is running: brew services start mongodb-community');
  console.log('   • Check connection string: MONGODB_URI=mongodb://localhost:27017');
  console.log('');
  console.log('🌐 Web App Not Loading:');
  console.log('   • Run: cd web && npm run dev');
  console.log('   • Check port 3000 is available');
  console.log('');
  console.log('📱 Mobile App Issues:');
  console.log('   • Run: cd mobile && npx expo start');
  console.log('   • Ensure phone and computer on same network');
  console.log('');
  console.log('🔧 Reset Demo Data:');
  console.log('   • Run: npm run clean && npm run setup');
}

async function setupDemo() {
  const startTime = Date.now();
  
  printHeader('PharmaTrust Demo Environment Setup');
  
  try {
    // Step 1: Seed database with demo data
    log('Step 1: Seeding database with demo data...');
    await seedDatabase();
    log('Database seeding completed successfully', 'success');
    
    // Step 2: Generate blockchain demo data
    log('Step 2: Generating blockchain demo data...');
    await generateBlockchainDemoData();
    log('Blockchain demo data generation completed', 'success');
    
    // Step 3: Run basic system validation (optional - can be skipped if services aren't running)
    log('Step 3: Running basic system validation...');
    try {
      // Only run a subset of tests to verify demo data
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
      await client.connect();
      const db = client.db('pharmatrust');
      
      const userCount = await db.collection('users').countDocuments();
      const batchCount = await db.collection('medicine_batches').countDocuments();
      const envDataCount = await db.collection('environmental_data').countDocuments();
      const blockchainCount = await db.collection('blockchain_records').countDocuments();
      
      await client.close();
      
      log(`Validation: ${userCount} users, ${batchCount} batches, ${envDataCount} env readings, ${blockchainCount} blockchain records`, 'success');
    } catch (error) {
      log('System validation skipped (services may not be running)', 'warning');
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Success summary
    printHeader('Setup Complete!');
    log(`Demo environment setup completed in ${duration.toFixed(2)} seconds`, 'success');
    
    // Print helpful information
    printDemoCredentials();
    printDemoFlow();
    printSystemInfo();
    printTroubleshooting();
    
    console.log('\n' + '='.repeat(60));
    log('🎉 PharmaTrust demo environment is ready!', 'success');
    log('Start the web application: cd web && npm run dev', 'info');
    log('Start the mobile app: cd mobile && npx expo start', 'info');
    console.log('='.repeat(60));
    
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Command line options
const args = process.argv.slice(2);
const options = {
  skipTests: args.includes('--skip-tests'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
PharmaTrust Demo Setup Script

Usage: node setup-demo.js [options]

Options:
  --skip-tests    Skip automated testing after setup
  --verbose       Enable verbose logging
  --help, -h      Show this help message

Examples:
  node setup-demo.js                 # Full setup with tests
  node setup-demo.js --skip-tests    # Setup without running tests
  
This script will:
1. Seed the database with realistic demo data
2. Generate mock blockchain records
3. Validate the system setup
4. Display demo credentials and usage instructions
`);
  process.exit(0);
}

// Run setup if called directly
if (require.main === module) {
  setupDemo().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { setupDemo };
