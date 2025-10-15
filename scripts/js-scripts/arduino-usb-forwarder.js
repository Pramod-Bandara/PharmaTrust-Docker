#!/usr/bin/env node

/**
 * Arduino USB Forwarder for PharmaTrust
 * 
 * This script reads JSON data from Arduino via USB serial connection
 * and forwards it to the PharmaTrust IoT API endpoint.
 * 
 * Usage:
 *   node arduino-usb-forwarder.js [port] [api-url]
 * 
 * Example:
 *   node arduino-usb-forwarder.js /dev/ttyUSB0 http://localhost:3000/api/iot/readings
 *   node arduino-usb-forwarder.js COM3 https://pharmatrust.vercel.app/api/iot/readings
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// Configuration
const DEFAULT_PORT = process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0';
const DEFAULT_API_URL = 'http://localhost:3000/api/iot/readings';
const BAUD_RATE = 115200;
const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 3;

// Command line arguments
const serialPortPath = process.argv[2] || DEFAULT_PORT;
const apiUrl = process.argv[3] || DEFAULT_API_URL;

console.log('🔌 PharmaTrust Arduino USB Forwarder');
console.log(`📡 Serial Port: ${serialPortPath}`);
console.log(`🌐 API URL: ${apiUrl}`);
console.log('⏳ Connecting to Arduino...\n');

// Create serial port connection
const port = new SerialPort({
  path: serialPortPath,
  baudRate: BAUD_RATE,
  autoOpen: false
});

// Create parser for newline-delimited JSON
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Statistics
let stats = {
  connected: false,
  totalReadings: 0,
  successfulForwards: 0,
  failedForwards: 0,
  invalidReadings: 0,
  startTime: new Date()
};

// Forward data to API with retry logic
async function forwardToAPI(data, retries = 0) {
  try {
    const response = await axios.post(apiUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PharmaTrust-Arduino-USB-Forwarder/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.status === 200 || response.status === 201) {
      stats.successfulForwards++;
      console.log(`✅ Data forwarded successfully (${stats.successfulForwards}/${stats.totalReadings})`);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`⚠️  Forward failed, retrying in ${RETRY_DELAY/1000}s... (${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return forwardToAPI(data, retries + 1);
    } else {
      stats.failedForwards++;
      console.error(`❌ Failed to forward data after ${MAX_RETRIES} retries:`, error.message);
      return false;
    }
  }
}

// Handle incoming data from Arduino
parser.on('data', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const data = JSON.parse(trimmed);
    
    // Handle different event types
    if (data.event === 'startup') {
      console.log('🚀 Arduino startup detected');
      return;
    }
    
    if (data.event === 'reading_invalid') {
      stats.invalidReadings++;
      console.log('⚠️  Invalid reading from Arduino');
      return;
    }

    // Validate environmental data
    if (typeof data.temperature === 'number' && typeof data.humidity === 'number') {
      stats.totalReadings++;
      
      // Add timestamp if not present
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }

      console.log(`📊 T: ${data.temperature.toFixed(1)}°C, H: ${data.humidity.toFixed(1)}% (${data.batchId})`);
      
      // Forward to API
      await forwardToAPI(data);
    } else {
      stats.invalidReadings++;
      console.log('⚠️  Invalid data format:', trimmed);
    }
  } catch (error) {
    stats.invalidReadings++;
    console.error('❌ JSON parse error:', error.message);
    console.error('Raw data:', trimmed);
  }
});

// Handle serial port events
port.on('open', () => {
  stats.connected = true;
  console.log('✅ Serial port connected successfully');
  console.log('🔄 Waiting for Arduino data...\n');
});

port.on('error', (error) => {
  stats.connected = false;
  console.error('❌ Serial port error:', error.message);
  console.log('\n💡 Troubleshooting tips:');
  console.log('   - Check if Arduino is connected via USB');
  console.log('   - Verify the correct port (Windows: COM3, Linux/Mac: /dev/ttyUSB0 or /dev/ttyACM0)');
  console.log('   - Ensure Arduino is running PharmaTrust_USB_Fallback.ino');
  console.log('   - Check if another application is using the serial port');
  process.exit(1);
});

port.on('close', () => {
  stats.connected = false;
  console.log('🔌 Serial port disconnected');
});

// Display statistics periodically
setInterval(() => {
  if (stats.connected && stats.totalReadings > 0) {
    const uptime = Math.floor((new Date() - stats.startTime) / 1000);
    const successRate = ((stats.successfulForwards / stats.totalReadings) * 100).toFixed(1);
    
    console.log(`\n📈 Statistics (${uptime}s uptime):`);
    console.log(`   Total readings: ${stats.totalReadings}`);
    console.log(`   Successful forwards: ${stats.successfulForwards} (${successRate}%)`);
    console.log(`   Failed forwards: ${stats.failedForwards}`);
    console.log(`   Invalid readings: ${stats.invalidReadings}`);
  }
}, 60000); // Every minute

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Arduino USB forwarder...');
  
  if (port.isOpen) {
    port.close((error) => {
      if (error) {
        console.error('Error closing port:', error.message);
      } else {
        console.log('✅ Serial port closed successfully');
      }
      
      // Display final statistics
      const uptime = Math.floor((new Date() - stats.startTime) / 1000);
      console.log(`\n📊 Final Statistics (${uptime}s total uptime):`);
      console.log(`   Total readings: ${stats.totalReadings}`);
      console.log(`   Successful forwards: ${stats.successfulForwards}`);
      console.log(`   Failed forwards: ${stats.failedForwards}`);
      console.log(`   Invalid readings: ${stats.invalidReadings}`);
      
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Open the serial port
port.open((error) => {
  if (error) {
    console.error('❌ Failed to open serial port:', error.message);
    console.log('\n💡 Available ports:');
    
    SerialPort.list().then(ports => {
      ports.forEach(port => {
        console.log(`   ${port.path} - ${port.manufacturer || 'Unknown'}`);
      });
      
      if (ports.length === 0) {
        console.log('   No serial ports found');
      }
      
      process.exit(1);
    }).catch(err => {
      console.error('Error listing ports:', err.message);
      process.exit(1);
    });
  }
});

// Display help information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node arduino-usb-forwarder.js [port] [api-url]

Arguments:
  port     Serial port path (default: ${DEFAULT_PORT})
  api-url  API endpoint URL (default: ${DEFAULT_API_URL})

Examples:
  node arduino-usb-forwarder.js
  node arduino-usb-forwarder.js /dev/ttyACM0
  node arduino-usb-forwarder.js COM3 https://pharmatrust.vercel.app/api/iot/readings

Environment Variables:
  ARDUINO_PORT     Override default serial port
  PHARMATRUST_API  Override default API URL
  `);
  process.exit(0);
}
