#!/usr/bin/env node

/**
 * PharmaTrust IoT Temperature Alert Testing Script
 * 
 * This script simulates temperature readings for demonstration purposes.
 * It sends various temperature scenarios to test the alert system.
 */

const axios = require('axios');

const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL || 'http://localhost:4003';
const DEVICE_ID = 'DEMO_DEVICE_001';
const BATCH_ID = 'DEMO_BATCH_001';

// Temperature scenarios for testing
const SCENARIOS = {
  normal: { temp: 12, description: 'Normal pharmaceutical storage temperature' },
  warming: { temp: 18, description: 'Slightly elevated temperature' },
  warning: { temp: 23, description: 'Warning threshold - needs attention' },
  critical: { temp: 27, description: 'CRITICAL - immediate action required' },
  extreme: { temp: 32, description: 'Extreme temperature - drug efficacy at risk' },
  cooling: { temp: 15, description: 'Temperature cooling down' },
  cold_warning: { temp: 3, description: 'Cold warning - approaching freeze point' },
  freezing: { temp: 0, description: 'CRITICAL - freezing temperature detected' }
};

async function sendReading(temperature, humidity = 45, description = '') {
  const data = {
    batchId: BATCH_ID,
    deviceId: DEVICE_ID,
    temperature: parseFloat(temperature),
    humidity: parseFloat(humidity),
    timestamp: new Date().toISOString()
  };

  try {
    console.log(`\n📊 Sending: ${description || `${temperature}°C`}`);
    console.log(`🌡️  Temperature: ${temperature}°C`);
    console.log(`💧 Humidity: ${humidity}%`);
    
    const response = await axios.post(`${IOT_SERVICE_URL}/readings`, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Reading sent successfully`);
      if (response.data?.data?.isAnomaly) {
        console.log(`🚨 ANOMALY DETECTED - Severity: ${response.data.data.severity || 'unknown'}`);
      }
      return true;
    } else {
      console.log(`❌ Failed to send reading: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending reading:`, error.message);
    return false;
  }
}

async function runTemperatureDemo() {
  console.log('🏥 PharmaTrust IoT Temperature Alert Demo');
  console.log('==========================================');
  console.log(`📡 Target IoT Service: ${IOT_SERVICE_URL}`);
  console.log(`🆔 Device ID: ${DEVICE_ID}`);
  console.log(`📦 Batch ID: ${BATCH_ID}`);
  console.log('\n🎯 Temperature Thresholds:');
  console.log('   Normal: 8°C - 15°C');
  console.log('   Warning: 5°C - 22°C or 22°C - 25°C');
  console.log('   Critical: <2°C or >25°C');
  
  console.log('\n🚀 Starting temperature progression demo...');
  console.log('👀 Watch the Admin Dashboard for real-time updates!');

  // Simulate temperature increase scenario
  const sequence = [
    { scenario: 'normal', delay: 2000 },
    { scenario: 'warming', delay: 3000 },
    { scenario: 'warning', delay: 3000 },
    { scenario: 'critical', delay: 5000 }, // Hold critical for demo
    { scenario: 'extreme', delay: 3000 },
    { scenario: 'cooling', delay: 3000 },
    { scenario: 'normal', delay: 2000 }
  ];

  for (const step of sequence) {
    const scenario = SCENARIOS[step.scenario];
    await sendReading(scenario.temp, 45 + Math.random() * 10, scenario.description);
    
    console.log(`⏱️  Waiting ${step.delay / 1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, step.delay));
  }

  console.log('\n🎉 Demo sequence completed!');
  console.log('💡 You can also test individual scenarios using:');
  console.log('   node test-iot-temperature-alerts.js --scenario critical');
}

async function runScenario(scenarioName) {
  if (!SCENARIOS[scenarioName]) {
    console.error(`❌ Unknown scenario: ${scenarioName}`);
    console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
    return;
  }

  const scenario = SCENARIOS[scenarioName];
  console.log(`🧪 Testing scenario: ${scenarioName}`);
  await sendReading(scenario.temp, 45, scenario.description);
}

async function runContinuousDemo() {
  console.log('🔄 Starting continuous temperature simulation...');
  console.log('📈 This will gradually increase temperature over time');
  console.log('Press Ctrl+C to stop');

  let baseTemp = 12; // Start at normal temperature
  let direction = 1; // 1 for increasing, -1 for decreasing
  let counter = 0;

  const interval = setInterval(async () => {
    // Simulate realistic temperature changes
    const variation = (Math.random() - 0.5) * 2; // ±1°C random variation
    baseTemp += (direction * 0.5) + variation;

    // Reverse direction at extremes
    if (baseTemp > 30) direction = -1;
    if (baseTemp < 5) direction = 1;

    const humidity = 45 + Math.sin(counter * 0.1) * 10; // Varying humidity
    
    await sendReading(baseTemp.toFixed(1), humidity.toFixed(1), 
      `Continuous demo - ${counter * 30}s elapsed`);
    
    counter++;
  }, 30000); // Every 30 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping continuous demo...');
    clearInterval(interval);
    process.exit(0);
  });
}

async function testConnection() {
  console.log('🔍 Testing connection to IoT service...');
  
  try {
    const response = await axios.get(`${IOT_SERVICE_URL}/health`, { timeout: 5000 });
    console.log('✅ IoT service is reachable');
    console.log(`📊 Response:`, response.data);
  } catch (error) {
    console.error('❌ Cannot reach IoT service:', error.message);
    console.log('💡 Make sure Docker services are running:');
    console.log('   docker-compose up -d');
  }
}

async function runPopupDemo() {
  console.log('🎉 PharmaTrust Popup Alert Demo');
  console.log('================================');
  console.log('📱 Open both Admin Dashboard and IoT Test Page to see popup alerts!');
  console.log('🌐 Admin Dashboard: http://localhost/admin');
  console.log('🧪 IoT Test Page: http://localhost/iot-test');
  console.log('');
  console.log('🚀 Starting popup alert demonstration...');

  const popupSequence = [
    { 
      scenario: 'normal', 
      delay: 2000,
      description: 'Starting with normal temperature - no alerts expected'
    },
    { 
      scenario: 'warning', 
      delay: 4000,
      description: 'Temperature warning - expect yellow popup alert'
    },
    { 
      scenario: 'critical', 
      delay: 4000,
      description: 'CRITICAL temperature - expect red popup alert'
    },
    { 
      scenario: 'extreme', 
      delay: 4000,
      description: 'Extreme temperature - multiple alerts may trigger'
    },
    { 
      scenario: 'cooling', 
      delay: 3000,
      description: 'Temperature cooling down'
    },
    { 
      scenario: 'normal', 
      delay: 2000,
      description: 'Back to normal - alerts should clear'
    }
  ];

  console.log('👀 Watch for popup alerts in your browser windows!');
  console.log('');

  for (const step of popupSequence) {
    const scenario = SCENARIOS[step.scenario];
    console.log(`\n🎯 ${step.description}`);
    console.log(`📊 Sending: ${scenario.description}`);
    
    await sendReading(scenario.temp, 45 + Math.random() * 10, scenario.description);
    
    console.log(`⏱️  Waiting ${step.delay / 1000} seconds for popup alerts...`);
    await new Promise(resolve => setTimeout(resolve, step.delay));
  }

  console.log('\n🎉 Popup alert demo completed!');
  console.log('💡 Tips:');
  console.log('   - Critical alerts (red) stay visible longer');
  console.log('   - Warning alerts (yellow) auto-close after 10 seconds');
  console.log('   - Alerts show device info, temperature, and timestamp');
  console.log('   - Test page has manual test buttons for more alerts');
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case '--scenario':
      if (args[1]) {
        await runScenario(args[1]);
      } else {
        console.error('❌ Please specify a scenario name');
        console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
      }
      break;
    
    case '--continuous':
      await runContinuousDemo();
      break;
    
    case '--test-connection':
      await testConnection();
      break;
    
    case '--popup-demo':
      await runPopupDemo();
      break;
    
    case '--help':
      console.log('PharmaTrust IoT Temperature Alert Testing Script');
      console.log('');
      console.log('Usage:');
      console.log('  node test-iot-temperature-alerts.js              # Run full demo sequence');
      console.log('  node test-iot-temperature-alerts.js --scenario <name>  # Test specific scenario');
      console.log('  node test-iot-temperature-alerts.js --continuous       # Run continuous simulation');
      console.log('  node test-iot-temperature-alerts.js --test-connection  # Test IoT service connection');
      console.log('  node test-iot-temperature-alerts.js --popup-demo       # Demo popup alerts sequence');
      console.log('');
      console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
      break;
    
    default:
      await runTemperatureDemo();
      break;
  }
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
