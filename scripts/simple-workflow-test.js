#!/usr/bin/env node

/**
 * Simple PharmaTrust Workflow Test
 * Tests the basic end-to-end workflow functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testWorkflow() {
  console.log('🧪 Testing PharmaTrust Workflow...\n');
  
  try {
    // Step 1: Authenticate as manufacturer
    console.log('1️⃣ Authenticating as manufacturer...');
    const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'mfg1',
      password: 'demo123'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Step 2: Create a batch
    console.log('\n2️⃣ Creating medicine batch...');
    const batchData = {
      name: `Test Batch ${Date.now()}`,
      description: 'Integration test batch',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    const batchResponse = await axios.post(`${BASE_URL}/api/medicine/batches`, batchData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const batchId = batchResponse.data.batchId;
    console.log(`✅ Batch created: ${batchId}`);
    
    // Step 3: Generate QR code
    console.log('\n3️⃣ Generating QR code...');
    const qrResponse = await axios.post(`${BASE_URL}/api/admin/qr-generate`, {
      batchId: batchId
    });
    
    console.log('✅ QR code generated');
    console.log(`📱 QR Data: ${JSON.stringify(qrResponse.data.payload)}`);
    
    // Step 4: Simulate IoT data
    console.log('\n4️⃣ Simulating IoT sensor data...');
    const iotData = {
      batchId: batchId,
      deviceId: 'TEST_DHT22',
      temperature: 22.5,
      humidity: 45.0
    };
    
    const iotResponse = await axios.post(`${BASE_URL}/api/iot/readings`, iotData);
    console.log('✅ IoT data submitted');
    console.log(`🌡️ Reading: ${iotData.temperature}°C, ${iotData.humidity}%`);
    
    // Step 5: Verify batch (mobile simulation)
    console.log('\n5️⃣ Verifying batch authenticity...');
    const verifyResponse = await axios.post(`${BASE_URL}/api/blockchain/verify`, {
      batchId: batchId
    });
    
    console.log('✅ Batch verification completed');
    console.log(`🔗 Verified: ${verifyResponse.data.isVerified}`);
    
    // Step 6: Get batch details
    console.log('\n6️⃣ Retrieving batch information...');
    const batchDetailsResponse = await axios.get(`${BASE_URL}/api/medicine/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Batch details retrieved');
    console.log(`📦 Status: ${batchDetailsResponse.data.qualityStatus}`);
    console.log(`🏭 Stage: ${batchDetailsResponse.data.currentStage}`);
    
    console.log('\n🎉 Workflow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Batch ID: ${batchId}`);
    console.log(`   • QR Generated: ✅`);
    console.log(`   • IoT Data: ✅`);
    console.log(`   • Blockchain Verified: ${verifyResponse.data.isVerified ? '✅' : '❌'}`);
    console.log(`   • Quality Status: ${batchDetailsResponse.data.qualityStatus}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.response?.data || error.message);
    return false;
  }
}

// Run the test
testWorkflow()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
