#!/usr/bin/env node

/**
 * Comprehensive HiveMQ Integration Testing Script
 * 
 * This script performs end-to-end testing of the HiveMQ Cloud integration
 * before uploading code to ESP32 boards.
 */

import mqtt from 'mqtt';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Test configuration
const TEST_CONFIG = {
  hivemq: {
    host: 'e3dd87fcf2f74b1681d41863183a91d7.s1.eu.hivemq.cloud',
    port: 8883,
    username: 'pharmatrust',
    password: 'Pharmatrust@123'
  },
  iot_service: {
    url: 'http://localhost:4003'
  },
  topics: {
    temperature: 'pharmatrust/sensors/temperature',
    humidity: 'pharmatrust/sensors/humidity',
    status: 'pharmatrust/sensors/status',
    alerts: 'pharmatrust/alerts/environmental'
  }
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, message, warning = false) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(colorize('green', `✅ ${name}: PASSED`));
  } else if (warning) {
    testResults.warnings++;
    console.log(colorize('yellow', `⚠️  ${name}: WARNING - ${message}`));
  } else {
    testResults.failed++;
    console.log(colorize('red', `❌ ${name}: FAILED - ${message}`));
  }
  
  testResults.tests.push({
    name,
    passed,
    message: message || 'Success',
    warning
  });
}

// Test 1: Basic MQTT Connection
async function testMqttConnection() {
  console.log(colorize('cyan', '\n🔌 Testing MQTT Connection to HiveMQ Cloud...'));
  
  return new Promise((resolve) => {
    const client = mqtt.connect(`mqtts://${TEST_CONFIG.hivemq.host}:${TEST_CONFIG.hivemq.port}`, {
      username: TEST_CONFIG.hivemq.username,
      password: TEST_CONFIG.hivemq.password,
      protocol: 'mqtts',
      rejectUnauthorized: false,
      clientId: 'pharmatrust_test_' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 15000,
    });
    
    const timeout = setTimeout(() => {
      client.end();
      recordTest('MQTT Connection', false, 'Connection timeout after 15 seconds');
      resolve(false);
    }, 15000);
    
    client.on('connect', () => {
      clearTimeout(timeout);
      recordTest('MQTT Connection', true);
      client.end();
      resolve(true);
    });
    
    client.on('error', (error) => {
      clearTimeout(timeout);
      recordTest('MQTT Connection', false, error.message);
      client.end();
      resolve(false);
    });
  });
}

// Test 2: Topic Publishing Permissions
async function testTopicPermissions() {
  console.log(colorize('cyan', '\n🔐 Testing Topic Publishing Permissions...'));
  
  return new Promise((resolve) => {
    const client = mqtt.connect(`mqtts://${TEST_CONFIG.hivemq.host}:${TEST_CONFIG.hivemq.port}`, {
      username: TEST_CONFIG.hivemq.username,
      password: TEST_CONFIG.hivemq.password,
      protocol: 'mqtts',
      rejectUnauthorized: false,
      clientId: 'pharmatrust_perm_test_' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 10000,
    });
    
    let tests = 0;
    let passed = 0;
    
    function checkComplete() {
      if (tests === 4) {
        const success = passed === 4;
        recordTest('Topic Permissions', success, success ? undefined : `${passed}/4 topics accessible`);
        client.end();
        resolve(success);
      }
    }
    
    client.on('connect', () => {
      console.log(colorize('blue', '  Testing temperature topic...'));
      client.publish(TEST_CONFIG.topics.temperature, JSON.stringify({test: true}), (err) => {
        tests++;
        if (!err) passed++;
        else console.log(colorize('red', `  ❌ Temperature topic failed: ${err.message}`));
        checkComplete();
      });
      
      console.log(colorize('blue', '  Testing humidity topic...'));
      client.publish(TEST_CONFIG.topics.humidity, JSON.stringify({test: true}), (err) => {
        tests++;
        if (!err) passed++;
        else console.log(colorize('red', `  ❌ Humidity topic failed: ${err.message}`));
        checkComplete();
      });
      
      console.log(colorize('blue', '  Testing status topic...'));
      client.publish(TEST_CONFIG.topics.status, JSON.stringify({test: true}), (err) => {
        tests++;
        if (!err) passed++;
        else console.log(colorize('red', `  ❌ Status topic failed: ${err.message}`));
        checkComplete();
      });
      
      console.log(colorize('blue', '  Testing alerts topic...'));
      client.publish(TEST_CONFIG.topics.alerts, JSON.stringify({test: true}), (err) => {
        tests++;
        if (!err) passed++;
        else console.log(colorize('red', `  ❌ Alerts topic failed: ${err.message}`));
        checkComplete();
      });
    });
    
    client.on('error', (error) => {
      recordTest('Topic Permissions', false, error.message);
      client.end();
      resolve(false);
    });
    
    setTimeout(() => {
      if (tests < 4) {
        recordTest('Topic Permissions', false, 'Timeout waiting for publish confirmations');
        client.end();
        resolve(false);
      }
    }, 10000);
  });
}

// Test 3: MQTT Bridge Service
async function testMqttBridge() {
  console.log(colorize('cyan', '\n🌉 Testing MQTT Bridge Service...'));
  
  try {
    // Check if bridge service is running
    const response = await axios.get('http://localhost:4006/health', { timeout: 5000 });
    if (response.status === 200 && response.data.service === 'mqtt-bridge') {
      recordTest('MQTT Bridge Health', true);
      return true;
    } else {
      recordTest('MQTT Bridge Health', false, 'Unexpected response from bridge service');
      return false;
    }
  } catch (error) {
    recordTest('MQTT Bridge Health', false, `Bridge service not accessible: ${error.message}`);
    return false;
  }
}

// Test 4: IoT Service Integration
async function testIotService() {
  console.log(colorize('cyan', '\n📡 Testing IoT Service Integration...'));
  
  try {
    // Test IoT service health
    const healthResponse = await axios.get(`${TEST_CONFIG.iot_service.url}/health`, { timeout: 5000 });
    if (healthResponse.status === 200) {
      recordTest('IoT Service Health', true);
    } else {
      recordTest('IoT Service Health', false, 'IoT service health check failed');
      return false;
    }
    
    // Test direct data submission
    const testData = {
      batchId: 'TEST_BATCH_001',
      deviceId: 'TEST_DEVICE_001',
      temperature: 22.5,
      humidity: 65.0,
      timestamp: new Date().toISOString()
    };
    
    const dataResponse = await axios.post(`${TEST_CONFIG.iot_service.url}/readings`, testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    if (dataResponse.status === 200) {
      recordTest('IoT Service Data Ingestion', true);
      return true;
    } else {
      recordTest('IoT Service Data Ingestion', false, 'Failed to submit test data');
      return false;
    }
  } catch (error) {
    recordTest('IoT Service Integration', false, `IoT service error: ${error.message}`);
    return false;
  }
}

// Test 5: End-to-End Data Flow
async function testEndToEndFlow() {
  console.log(colorize('cyan', '\n🔄 Testing End-to-End Data Flow...'));
  
  return new Promise((resolve) => {
    // First, set up listener for IoT service to confirm data receipt
    let dataReceived = false;
    
    // Connect MQTT client to publish test data
    const client = mqtt.connect(`mqtts://${TEST_CONFIG.hivemq.host}:${TEST_CONFIG.hivemq.port}`, {
      username: TEST_CONFIG.hivemq.username,
      password: TEST_CONFIG.hivemq.password,
      protocol: 'mqtts',
      rejectUnauthorized: false,
      clientId: 'pharmatrust_e2e_test_' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 10000,
    });
    
    client.on('connect', () => {
      console.log(colorize('blue', '  Publishing test sensor data via MQTT...'));
      
      // Simulate Arduino sensor data
      const sensorData = {
        deviceId: 'ESP32_DHT22_TEST',
        timestamp: Date.now(),
        location: 'test_lab',
        batchId: 'E2E_TEST_BATCH',
        temperature: 23.7,
        unit: 'celsius'
      };
      
      client.publish(TEST_CONFIG.topics.temperature, JSON.stringify(sensorData), { qos: 1 }, (err) => {
        if (err) {
          recordTest('End-to-End Data Flow', false, `MQTT publish failed: ${err.message}`);
          client.end();
          resolve(false);
        } else {
          console.log(colorize('blue', '  ✅ Data published to HiveMQ Cloud'));
          
          // Wait a moment for data to be processed
          setTimeout(async () => {
            try {
              // Check if data reached IoT service
              const response = await axios.get(`${TEST_CONFIG.iot_service.url}/readings?limit=5`, { timeout: 5000 });
              const readings = response.data.items || [];
              
              const testReading = readings.find(r => r.batchId === 'E2E_TEST_BATCH');
              if (testReading) {
                recordTest('End-to-End Data Flow', true);
                resolve(true);
              } else {
                recordTest('End-to-End Data Flow', false, 'Test data not found in IoT service');
                resolve(false);
              }
            } catch (error) {
              recordTest('End-to-End Data Flow', false, `Failed to verify data in IoT service: ${error.message}`);
              resolve(false);
            } finally {
              client.end();
            }
          }, 3000);
        }
      });
    });
    
    client.on('error', (error) => {
      recordTest('End-to-End Data Flow', false, `MQTT connection error: ${error.message}`);
      client.end();
      resolve(false);
    });
    
    setTimeout(() => {
      recordTest('End-to-End Data Flow', false, 'Test timeout');
      client.end();
      resolve(false);
    }, 15000);
  });
}

// Test 6: Arduino Code Validation
async function validateArduinoCode() {
  console.log(colorize('cyan', '\n🔧 Validating Arduino Code...'));
  
  try {
    const arduinoPath = path.join(rootDir, 'hardware', 'IoT_board', 'PharmaTrust_IoT_MQTT', 'PharmaTrust_IoT_HiveMQ_Hybrid.ino');
    const code = await fs.readFile(arduinoPath, 'utf8');
    
    // Check for essential components
    const checks = [
      { name: 'WiFiClientSecure included', pattern: /#include\s*<WiFiClientSecure\.h>/ },
      { name: 'HiveMQ host configured', pattern: /e3dd87fcf2f74b1681d41863183a91d7\.s1\.eu\.hivemq\.cloud/ },
      { name: 'TLS port 8883 configured', pattern: /mqtt_port\s*=\s*8883/ },
      { name: 'Username configured', pattern: /mqtt_username\s*=\s*"pharmatrust"/ },
      { name: 'Password configured', pattern: /mqtt_password\s*=\s*"Pharmatrust@123"/ },
      { name: 'HTTP fallback implemented', pattern: /sendDataHTTP/ },
      { name: 'Error handling present', pattern: /connectMQTT.*error|mqtt.*error/i },
      { name: 'LED indicators configured', pattern: /LED_OK|LED_TX|LED_ERR/ }
    ];
    
    let passed = 0;
    checks.forEach(check => {
      if (check.pattern.test(code)) {
        passed++;
        console.log(colorize('green', `  ✅ ${check.name}`));
      } else {
        console.log(colorize('red', `  ❌ ${check.name}`));
      }
    });
    
    const success = passed === checks.length;
    recordTest('Arduino Code Validation', success, `${passed}/${checks.length} checks passed`);
    return success;
  } catch (error) {
    recordTest('Arduino Code Validation', false, `Could not read Arduino code: ${error.message}`);
    return false;
  }
}

// Test 7: Configuration Completeness
async function checkConfiguration() {
  console.log(colorize('cyan', '\n⚙️  Checking Configuration Completeness...'));
  
  const configChecks = [
    {
      name: 'Docker Compose MQTT Bridge',
      check: async () => {
        const composePath = path.join(rootDir, 'docker-compose.yml');
        const content = await fs.readFile(composePath, 'utf8');
        return content.includes('mqtt-bridge') && content.includes('HIVEMQ_USERNAME');
      }
    },
    {
      name: 'MQTT Bridge Service Files',
      check: async () => {
        const bridgePath = path.join(rootDir, 'services', 'mqtt-bridge', 'src', 'server.ts');
        try {
          await fs.access(bridgePath);
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'HiveMQ Setup Script',
      check: async () => {
        const scriptPath = path.join(rootDir, 'scripts', 'setup-hivemq.js');
        try {
          await fs.access(scriptPath);
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Updated MQTT Guide',
      check: async () => {
        const guidePath = path.join(rootDir, 'MQTT_SETUP_GUIDE.md');
        const content = await fs.readFile(guidePath, 'utf8');
        return content.includes('HiveMQ Cloud') && content.includes('pharmatrust');
      }
    }
  ];
  
  let passed = 0;
  for (const check of configChecks) {
    try {
      const result = await check.check();
      if (result) {
        passed++;
        console.log(colorize('green', `  ✅ ${check.name}`));
      } else {
        console.log(colorize('red', `  ❌ ${check.name}`));
      }
    } catch (error) {
      console.log(colorize('red', `  ❌ ${check.name}: ${error.message}`));
    }
  }
  
  const success = passed === configChecks.length;
  recordTest('Configuration Completeness', success, `${passed}/${configChecks.length} configurations present`);
  return success;
}

// Generate comprehensive report
function generateReport() {
  console.log(colorize('cyan', '\n📊 TEST RESULTS SUMMARY'));
  console.log(colorize('cyan', '=' .repeat(50)));
  
  console.log(`Total Tests: ${testResults.total}`);
  console.log(colorize('green', `Passed: ${testResults.passed}`));
  console.log(colorize('red', `Failed: ${testResults.failed}`));
  console.log(colorize('yellow', `Warnings: ${testResults.warnings}`));
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);
  
  console.log(colorize('cyan', '\n📋 DETAILED RESULTS:'));
  testResults.tests.forEach(test => {
    const status = test.passed ? '✅' : test.warning ? '⚠️' : '❌';
    console.log(`${status} ${test.name}: ${test.message}`);
  });
  
  // Recommendations
  console.log(colorize('cyan', '\n🎯 RECOMMENDATIONS:'));
  
  if (testResults.failed === 0) {
    console.log(colorize('green', '🎉 All tests passed! Your HiveMQ integration is ready for ESP32 deployment.'));
    console.log(colorize('blue', '\n📱 Next Steps:'));
    console.log(colorize('blue', '1. Flash the Arduino code to your ESP32'));
    console.log(colorize('blue', '2. Update WiFi credentials in the sketch'));
    console.log(colorize('blue', '3. Monitor Serial output for connection status'));
    console.log(colorize('blue', '4. Check admin dashboard for real-time data'));
  } else {
    console.log(colorize('red', '⚠️  Some tests failed. Please address the following before ESP32 deployment:'));
    
    const failedTests = testResults.tests.filter(t => !t.passed && !t.warning);
    failedTests.forEach(test => {
      console.log(colorize('red', `- ${test.name}: ${test.message}`));
    });
    
    console.log(colorize('yellow', '\n🔧 Troubleshooting Tips:'));
    console.log(colorize('yellow', '- Check HiveMQ console permissions are configured'));
    console.log(colorize('yellow', '- Verify MQTT bridge service is running: docker-compose up -d'));
    console.log(colorize('yellow', '- Ensure IoT service is accessible: docker-compose logs iot'));
    console.log(colorize('yellow', '- Test credentials manually in HiveMQ webclient'));
  }
  
  return testResults.failed === 0;
}

// Main test runner
async function runAllTests() {
  console.log(colorize('magenta', '🧪 PHARMATRUST HIVEMQ INTEGRATION TESTING'));
  console.log(colorize('magenta', '=' .repeat(50)));
  console.log(colorize('blue', 'Testing HiveMQ Cloud integration before ESP32 deployment...\n'));
  
  try {
    await testMqttConnection();
    await testTopicPermissions();
    await testMqttBridge();
    await testIotService();
    await testEndToEndFlow();
    await validateArduinoCode();
    await checkConfiguration();
    
    const allPassed = generateReport();
    
    // Save detailed report
    const reportPath = path.join(rootDir, 'hivemq-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
    console.log(colorize('blue', `\n📄 Detailed report saved to: hivemq-test-report.json`));
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error(colorize('red', '\n❌ Testing failed with error:'), error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
