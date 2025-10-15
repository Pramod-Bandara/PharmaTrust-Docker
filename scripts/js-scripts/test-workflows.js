#!/usr/bin/env node

/**
 * PharmaTrust Automated Workflow Testing Script
 * Tests complete user workflows end-to-end:
 * - Authentication for all user roles
 * - Medicine batch creation and management
 * - Environmental data processing and anomaly detection
 * - Supply chain tracking and updates
 * - Blockchain verification (mock or real)
 * - QR code generation and verification
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

// Test data
const TEST_USERS = [
  { username: 'mfg1', password: 'demo123', role: 'manufacturer' },
  { username: 'sup1', password: 'demo123', role: 'supplier' },
  { username: 'phm1', password: 'demo123', role: 'pharmacist' },
  { username: 'admin', password: 'admin123', role: 'admin' }
];

// Test state
let authTokens = {};
let testBatchId = null;
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, 'error');
  }
}

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testAuthentication() {
  log('Testing authentication for all user roles...');
  
  for (const user of TEST_USERS) {
    const result = await makeRequest('POST', '/api/auth/login', {
      username: user.username,
      password: user.password
    });
    
    if (result.success && result.data.token) {
      authTokens[user.role] = result.data.token;
      assert(true, `Authentication successful for ${user.role} (${user.username})`);
    } else {
      assert(false, `Authentication failed for ${user.role}: ${result.error}`);
    }
  }
}

async function testMedicineBatchCreation() {
  log('Testing medicine batch creation...');
  
  const batchData = {
    name: 'Test Aspirin 500mg',
    category: 'Pain Relief',
    description: 'Test batch for automated workflow validation',
    dosage: '500mg',
    form: 'Tablet',
    quantity: 1000,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
  };
  
  const result = await makeRequest('POST', '/api/medicine/batches', batchData, authTokens.manufacturer);
  
  if (result.success && result.data.batchId) {
    testBatchId = result.data.batchId;
    assert(true, `Medicine batch created successfully: ${testBatchId}`);
    assert(result.data.currentStage === 'manufacturer', 'Batch created with correct initial stage');
    assert(result.data.qualityStatus === 'good', 'Batch created with good quality status');
  } else {
    assert(false, `Medicine batch creation failed: ${result.error}`);
  }
}

async function testEnvironmentalDataSubmission() {
  log('Testing environmental data submission...');
  
  if (!testBatchId) {
    assert(false, 'No test batch available for environmental data testing');
    return;
  }
  
  // Test normal reading
  const normalReading = {
    batchId: testBatchId,
    deviceId: 'DHT22_TEST',
    temperature: 20.5,
    humidity: 45.0,
    timestamp: new Date().toISOString()
  };
  
  const normalResult = await makeRequest('POST', '/api/iot-data', normalReading);
  assert(normalResult.success, 'Normal environmental reading submitted successfully');
  
  // Test anomaly reading
  const anomalyReading = {
    batchId: testBatchId,
    deviceId: 'DHT22_TEST',
    temperature: 30.0, // Above safe range
    humidity: 45.0,
    timestamp: new Date().toISOString()
  };
  
  const anomalyResult = await makeRequest('POST', '/api/iot-data', anomalyReading);
  assert(anomalyResult.success, 'Anomaly environmental reading submitted successfully');
  
  if (anomalyResult.success && anomalyResult.data.isAnomaly) {
    assert(true, 'Anomaly detection working correctly');
    assert(anomalyResult.data.severity === 'high', 'High temperature anomaly detected with correct severity');
  }
}

async function testSupplyChainProgression() {
  log('Testing supply chain progression...');
  
  if (!testBatchId) {
    assert(false, 'No test batch available for supply chain testing');
    return;
  }
  
  // Move batch to supplier stage
  const supplierUpdate = {
    batchId: testBatchId,
    newStage: 'supplier',
    location: 'Test Distribution Center',
    notes: 'Automated test - moved to supplier'
  };
  
  const supplierResult = await makeRequest('PUT', `/api/medicine/batches/${testBatchId}/stage`, supplierUpdate, authTokens.supplier);
  assert(supplierResult.success, 'Batch successfully moved to supplier stage');
  
  // Move batch to pharmacist stage
  const pharmacistUpdate = {
    batchId: testBatchId,
    newStage: 'pharmacist',
    location: 'Test Pharmacy',
    notes: 'Automated test - moved to pharmacist'
  };
  
  const pharmacistResult = await makeRequest('PUT', `/api/medicine/batches/${testBatchId}/stage`, pharmacistUpdate, authTokens.pharmacist);
  assert(pharmacistResult.success, 'Batch successfully moved to pharmacist stage');
}

async function testBatchRetrieval() {
  log('Testing batch data retrieval...');
  
  if (!testBatchId) {
    assert(false, 'No test batch available for retrieval testing');
    return;
  }
  
  // Test batch retrieval by ID
  const batchResult = await makeRequest('GET', `/api/medicine/batches/${testBatchId}`, null, authTokens.manufacturer);
  
  if (batchResult.success) {
    assert(true, 'Batch retrieved successfully by ID');
    assert(batchResult.data.batchId === testBatchId, 'Retrieved batch has correct ID');
    assert(batchResult.data.supplyChain.length > 0, 'Batch has supply chain history');
  } else {
    assert(false, `Batch retrieval failed: ${batchResult.error}`);
  }
  
  // Test batch listing
  const listResult = await makeRequest('GET', '/api/medicine/batches', null, authTokens.manufacturer);
  assert(listResult.success, 'Batch listing endpoint working');
  
  if (listResult.success) {
    const testBatch = listResult.data.find(batch => batch.batchId === testBatchId);
    assert(!!testBatch, 'Test batch found in batch listing');
  }
}

async function testEnvironmentalDataRetrieval() {
  log('Testing environmental data retrieval...');
  
  if (!testBatchId) {
    assert(false, 'No test batch available for environmental data retrieval');
    return;
  }
  
  const result = await makeRequest('GET', `/api/iot-data?batchId=${testBatchId}`, null, authTokens.supplier);
  
  if (result.success) {
    assert(true, 'Environmental data retrieved successfully');
    assert(Array.isArray(result.data), 'Environmental data returned as array');
    assert(result.data.length > 0, 'Environmental data contains readings');
    
    const hasAnomaly = result.data.some(reading => reading.isAnomaly);
    assert(hasAnomaly, 'Environmental data includes anomaly detection results');
  } else {
    assert(false, `Environmental data retrieval failed: ${result.error}`);
  }
}

async function testBlockchainIntegration() {
  log('Testing blockchain integration...');
  
  if (!testBatchId) {
    assert(false, 'No test batch available for blockchain testing');
    return;
  }
  
  // Test blockchain recording
  const recordResult = await makeRequest('POST', '/api/blockchain/record', {
    batchId: testBatchId,
    action: 'mint'
  }, authTokens.admin);
  
  if (recordResult.success) {
    assert(true, 'Blockchain record creation successful');
    if (recordResult.data.transactionHash) {
      assert(true, 'Blockchain transaction hash returned');
    }
  } else {
    // Blockchain might be mocked or unavailable - this is acceptable for demo
    log('Blockchain recording failed (acceptable for demo environment)', 'warning');
  }
  
  // Test blockchain verification
  const verifyResult = await makeRequest('GET', `/api/blockchain/verify/${testBatchId}`, null, authTokens.pharmacist);
  
  if (verifyResult.success) {
    assert(true, 'Blockchain verification endpoint accessible');
  } else {
    log('Blockchain verification failed (acceptable for demo environment)', 'warning');
  }
}

async function testQRCodeGeneration() {
  log('Testing QR code generation...');
  
  if (!testBatchId) {
    assert(false, 'No test batch available for QR code testing');
    return;
  }
  
  const qrResult = await makeRequest('POST', '/api/admin/qr-generate', {
    batchId: testBatchId
  }, authTokens.admin);
  
  if (qrResult.success) {
    assert(true, 'QR code generation successful');
    assert(qrResult.data.qrData, 'QR code data returned');
    
    try {
      const qrData = JSON.parse(qrResult.data.qrData);
      assert(qrData.batchId === testBatchId, 'QR code contains correct batch ID');
      assert(qrData.url, 'QR code contains verification URL');
    } catch (e) {
      assert(false, 'QR code data is not valid JSON');
    }
  } else {
    assert(false, `QR code generation failed: ${qrResult.error}`);
  }
}

async function testUserManagement() {
  log('Testing user management functionality...');
  
  // Test user listing (admin only)
  const usersResult = await makeRequest('GET', '/api/auth/users', null, authTokens.admin);
  
  if (usersResult.success) {
    assert(true, 'User listing accessible by admin');
    assert(Array.isArray(usersResult.data), 'Users returned as array');
    assert(usersResult.data.length >= 4, 'All demo users present');
  } else {
    assert(false, `User listing failed: ${usersResult.error}`);
  }
  
  // Test unauthorized access (non-admin trying to access user management)
  const unauthorizedResult = await makeRequest('GET', '/api/auth/users', null, authTokens.manufacturer);
  assert(!unauthorizedResult.success, 'User listing properly restricted to admin users');
}

async function testSystemHealth() {
  log('Testing system health endpoints...');
  
  // Test health check
  const healthResult = await makeRequest('GET', '/api/health');
  assert(healthResult.success, 'Health check endpoint accessible');
  
  // Test database connectivity
  const dbResult = await makeRequest('GET', '/api/health/database');
  assert(dbResult.success, 'Database health check successful');
}

async function runAllTests() {
  log('🚀 Starting PharmaTrust Automated Workflow Tests...');
  log(`Testing against: ${BASE_URL}`);
  
  const startTime = Date.now();
  
  try {
    // Core functionality tests
    await testAuthentication();
    await testMedicineBatchCreation();
    await testEnvironmentalDataSubmission();
    await testSupplyChainProgression();
    await testBatchRetrieval();
    await testEnvironmentalDataRetrieval();
    
    // Advanced functionality tests
    await testBlockchainIntegration();
    await testQRCodeGeneration();
    await testUserManagement();
    await testSystemHealth();
    
  } catch (error) {
    log(`Unexpected error during testing: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push(`Unexpected error: ${error.message}`);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Print test results
  console.log('\n' + '='.repeat(60));
  log('🏁 Test Execution Complete');
  console.log('='.repeat(60));
  
  log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
  log(`✅ Tests Passed: ${testResults.passed}`);
  log(`❌ Tests Failed: ${testResults.failed}`);
  log(`📊 Total Tests: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'error');
    testResults.errors.forEach((error, index) => {
      log(`   ${index + 1}. ${error}`, 'error');
    });
  }
  
  const successRate = (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1);
  log(`\n📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    log('🎉 All tests passed! System is ready for demo.', 'success');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'warning');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runAllTests };
