#!/usr/bin/env node

/**
 * PharmaTrust End-to-End Integration Testing Script
 * Tests complete workflow: batch creation → QR generation → mobile scanning → verification
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const BASE_URL = 'http://localhost:3000';
const IOT_SERVICE_URL = 'http://localhost:4003';
const WS_URL = 'ws://localhost:4003';

// Test credentials
const TEST_USERS = {
  manufacturer: { username: 'mfg1', password: 'demo123' },
  supplier: { username: 'sup1', password: 'demo123' },
  pharmacist: { username: 'phm1', password: 'demo123' },
  admin: { username: 'admin', password: 'admin123' }
};

let authTokens = {};
let testBatchId = null;
let testQRData = null;

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const icons = { info: '📋', success: '✅', error: '❌', warning: '⚠️' };
  console.log(`${icons[type]} [${timestamp}] ${message}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Authentication
async function authenticateUsers() {
  log('Authenticating all user roles...');
  
  for (const [role, credentials] of Object.entries(TEST_USERS)) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
      authTokens[role] = response.data.token;
      log(`Authenticated ${role}: ${credentials.username}`, 'success');
    } catch (error) {
      log(`Failed to authenticate ${role}: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Test 1: Real-time WebSocket Connection
async function testWebSocketConnection() {
  log('Testing WebSocket connection to IoT service...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let messageReceived = false;
    
    ws.on('open', () => {
      log('WebSocket connection established', 'success');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        log(`WebSocket message received: ${message.type}`, 'success');
        messageReceived = true;
        ws.close();
        resolve(true);
      } catch (error) {
        log(`WebSocket message parse error: ${error.message}`, 'error');
      }
    });
    
    ws.on('error', (error) => {
      log(`WebSocket connection error: ${error.message}`, 'error');
      reject(error);
    });
    
    ws.on('close', () => {
      if (!messageReceived) {
        log('WebSocket closed without receiving messages', 'warning');
        resolve(false);
      }
    });
    
    // Send test IoT data to trigger WebSocket message
    setTimeout(async () => {
      try {
        await axios.post(`${BASE_URL}/api/iot/readings`, {
          batchId: 'TEST_BATCH_' + Date.now(),
          deviceId: 'TEST_DHT22',
          temperature: 22.5,
          humidity: 45.0
        });
      } catch (error) {
        log(`Failed to send test IoT data: ${error.message}`, 'error');
      }
    }, 1000);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!messageReceived) {
        ws.close();
        resolve(false);
      }
    }, 10000);
  });
}

// Test 2: Batch Creation Workflow
async function testBatchCreation() {
  log('Testing batch creation workflow...');
  
  const batchData = {
    name: `Integration Test Batch ${Date.now()}`,
    description: 'Test batch for end-to-end integration testing',
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    recordOnBlockchain: true
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/api/medicine/batches`, batchData, {
      headers: { Authorization: `Bearer ${authTokens.manufacturer}` }
    });
    
    testBatchId = response.data.batchId;
    log(`Batch created successfully: ${testBatchId}`, 'success');
    
    // Verify batch exists
    const verifyResponse = await axios.get(`${BASE_URL}/api/medicine/batches`, {
      headers: { Authorization: `Bearer ${authTokens.manufacturer}` }
    });
    
    const createdBatch = verifyResponse.data.batches.find(b => b.batchId === testBatchId);
    if (createdBatch) {
      log('Batch verification successful', 'success');
      return true;
    } else {
      log('Batch verification failed - batch not found', 'error');
      return false;
    }
  } catch (error) {
    log(`Batch creation failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 3: QR Code Generation
async function testQRGeneration() {
  log('Testing QR code generation...');
  
  if (!testBatchId) {
    log('No test batch available for QR generation', 'error');
    return false;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/api/admin/qr-generate`, {
      batchId: testBatchId
    }, {
      headers: { Authorization: `Bearer ${authTokens.admin}` }
    });
    
    testQRData = response.data;
    log(`QR code generated successfully for batch: ${testBatchId}`, 'success');
    log(`QR payload: ${JSON.stringify(testQRData.payload)}`, 'info');
    return true;
  } catch (error) {
    log(`QR generation failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 4: Mobile Verification Simulation
async function testMobileVerification() {
  log('Testing mobile verification workflow...');
  
  if (!testQRData) {
    log('No QR data available for mobile verification', 'error');
    return false;
  }
  
  try {
    // Simulate mobile app scanning QR and calling verification API
    const batchId = testQRData.payload.batchId;
    
    // Step 1: Get batch information
    const batchResponse = await axios.get(`${BASE_URL}/api/medicine/batches/${batchId}`);
    const batchInfo = batchResponse.data;
    
    // Step 2: Verify blockchain authenticity
    const verifyResponse = await axios.post(`${BASE_URL}/api/blockchain/verify`, {
      batchId: batchId
    });
    const verificationResult = verifyResponse.data;
    
    log(`Mobile verification completed:`, 'success');
    log(`  Batch: ${batchInfo.name}`, 'info');
    log(`  Status: ${batchInfo.qualityStatus}`, 'info');
    log(`  Blockchain Verified: ${verificationResult.isVerified}`, 'info');
    
    return verificationResult.isVerified;
  } catch (error) {
    log(`Mobile verification failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 5: IoT Data Flow and Anomaly Detection
async function testIoTDataFlow() {
  log('Testing IoT data flow and anomaly detection...');
  
  if (!testBatchId) {
    log('No test batch available for IoT testing', 'error');
    return false;
  }
  
  try {
    // Send normal reading
    const normalReading = {
      batchId: testBatchId,
      deviceId: 'TEST_DHT22_INTEGRATION',
      temperature: 20.0,
      humidity: 50.0
    };
    
    const normalResponse = await axios.post(`${BASE_URL}/api/iot/readings`, normalReading);
    log(`Normal IoT reading processed: ${JSON.stringify(normalResponse.data.data || normalResponse.data)}`, 'success');
    
    // Send anomaly reading
    const anomalyReading = {
      batchId: testBatchId,
      deviceId: 'TEST_DHT22_INTEGRATION',
      temperature: 35.0, // Above threshold
      humidity: 80.0     // Above threshold
    };
    
    const anomalyResponse = await axios.post(`${BASE_URL}/api/iot/readings`, anomalyReading);
    const anomalyData = anomalyResponse.data.data;
    
    log(`Anomaly IoT reading processed:`, 'success');
    log(`  Temperature: ${anomalyData.temperature}°C (anomaly: ${anomalyData.isAnomaly})`, 'info');
    log(`  Humidity: ${anomalyData.humidity}% (severity: ${anomalyData.severity})`, 'info');
    
    // Verify anomaly was detected
    if (anomalyData.isAnomaly && anomalyData.severity) {
      log('Anomaly detection working correctly', 'success');
      return true;
    } else {
      log('Anomaly detection failed - no anomaly detected', 'error');
      return false;
    }
  } catch (error) {
    log(`IoT data flow test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 6: Dashboard Data Integration
async function testDashboardIntegration() {
  log('Testing dashboard data integration...');
  
  const dashboardTests = [
    {
      name: 'Manufacturer Dashboard',
      endpoint: '/api/medicine/batches',
      token: authTokens.manufacturer
    },
    {
      name: 'Supplier Dashboard - IoT Data',
      endpoint: '/api/iot/readings?limit=10',
      token: authTokens.supplier
    },
    {
      name: 'Pharmacist Dashboard - Batch Verification',
      endpoint: '/api/medicine/batches',
      token: authTokens.pharmacist
    },
    {
      name: 'Admin Dashboard - System Overview',
      endpoint: '/api/admin/system-stats',
      token: authTokens.admin
    }
  ];
  
  let allPassed = true;
  
  for (const test of dashboardTests) {
    try {
      const response = await axios.get(`${BASE_URL}${test.endpoint}`, {
        headers: { Authorization: `Bearer ${test.token}` }
      });
      
      if (response.status === 200 && response.data) {
        log(`${test.name}: Data loaded successfully`, 'success');
      } else {
        log(`${test.name}: Invalid response`, 'error');
        allPassed = false;
      }
    } catch (error) {
      log(`${test.name}: Failed - ${error.message}`, 'error');
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test 7: Service Health Checks
async function testServiceHealth() {
  log('Testing service health checks...');
  
  const services = [
    { name: 'Auth Service', url: 'http://localhost:4001/health' },
    { name: 'Medicine Service', url: 'http://localhost:4002/health' },
    { name: 'IoT Service', url: 'http://localhost:4003/health' },
    { name: 'Blockchain Service', url: 'http://localhost:4004/health' },
    { name: 'Mobile Gateway', url: 'http://localhost:4010/health' }
  ];
  
  let allHealthy = true;
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      if (response.status === 200) {
        log(`${service.name}: Healthy`, 'success');
      } else {
        log(`${service.name}: Unhealthy (status: ${response.status})`, 'error');
        allHealthy = false;
      }
    } catch (error) {
      log(`${service.name}: Unreachable - ${error.message}`, 'error');
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

// Main test runner
async function runIntegrationTests() {
  console.log('\n============================================================');
  console.log('🧪 PharmaTrust End-to-End Integration Testing');
  console.log('============================================================\n');
  
  const startTime = Date.now();
  const testResults = {};
  
  try {
    // Pre-test setup
    log('Starting integration tests...');
    await delay(1000);
    
    // Run tests
    testResults.authentication = await authenticateUsers().then(() => true).catch(() => false);
    await delay(500);
    
    testResults.serviceHealth = await testServiceHealth();
    await delay(500);
    
    testResults.webSocketConnection = await testWebSocketConnection();
    await delay(500);
    
    testResults.batchCreation = await testBatchCreation();
    await delay(500);
    
    testResults.qrGeneration = await testQRGeneration();
    await delay(500);
    
    testResults.mobileVerification = await testMobileVerification();
    await delay(500);
    
    testResults.iotDataFlow = await testIoTDataFlow();
    await delay(500);
    
    testResults.dashboardIntegration = await testDashboardIntegration();
    
  } catch (error) {
    log(`Integration test failed with error: ${error.message}`, 'error');
  }
  
  // Results summary
  console.log('\n============================================================');
  console.log('📊 Integration Test Results');
  console.log('============================================================\n');
  
  const passed = Object.values(testResults).filter(Boolean).length;
  const total = Object.keys(testResults).length;
  
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const formattedName = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${formattedName}`);
  }
  
  console.log(`\n📈 Overall Results: ${passed}/${total} tests passed`);
  console.log(`⏱️  Total Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  
  if (passed === total) {
    console.log('\n🎉 All integration tests passed! System is ready for demonstration.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }
  
  console.log('\n============================================================\n');
  
  return passed === total;
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Integration test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };
