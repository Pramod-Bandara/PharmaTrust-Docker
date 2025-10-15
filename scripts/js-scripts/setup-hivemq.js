#!/usr/bin/env node

/**
 * HiveMQ Setup Helper Script
 * 
 * This script helps users set up their HiveMQ Cloud credentials and
 * verifies the connection before deploying the system.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkEnvFile() {
  const envPath = path.join(rootDir, '.env');
  try {
    await fs.access(envPath);
    return true;
  } catch {
    return false;
  }
}

async function updateEnvFile(credentials) {
  const envPath = path.join(rootDir, '.env');
  let envContent = '';
  
  try {
    envContent = await fs.readFile(envPath, 'utf8');
  } catch {
    // File doesn't exist, create new
    envContent = '';
  }
  
  // Remove existing HiveMQ entries
  const lines = envContent.split('\n').filter(line => 
    !line.startsWith('HIVEMQ_USERNAME=') && 
    !line.startsWith('HIVEMQ_PASSWORD=')
  );
  
  // Add new HiveMQ credentials
  lines.push('# HiveMQ Cloud Credentials');
  lines.push(`HIVEMQ_USERNAME=${credentials.username}`);
  lines.push(`HIVEMQ_PASSWORD=${credentials.password}`);
  lines.push('');
  
  await fs.writeFile(envPath, lines.join('\n'));
}

async function updateArduinoCode(credentials) {
  const arduinoPath = path.join(rootDir, 'hardware', 'IoT_board', 'PharmaTrust_IoT_MQTT');
  
  try {
    // Update the main MQTT sketch
    const sketchPath = path.join(arduinoPath, 'PharmaTrust_IoT_MQTT.ino');
    let content = await fs.readFile(sketchPath, 'utf8');
    
    content = content.replace(
      /const char\* mqtt_username = ".*";/,
      `const char* mqtt_username = "${credentials.username}";`
    );
    content = content.replace(
      /const char\* mqtt_password = ".*";/,
      `const char* mqtt_password = "${credentials.password}";`
    );
    
    await fs.writeFile(sketchPath, content);
    
    // Update the hybrid sketch
    const hybridPath = path.join(arduinoPath, 'PharmaTrust_IoT_HiveMQ_Hybrid.ino');
    try {
      let hybridContent = await fs.readFile(hybridPath, 'utf8');
      
      hybridContent = hybridContent.replace(
        /const char\* mqtt_username = ".*";/,
        `const char* mqtt_username = "${credentials.username}";`
      );
      hybridContent = hybridContent.replace(
        /const char\* mqtt_password = ".*";/,
        `const char* mqtt_password = "${credentials.password}";`
      );
      
      await fs.writeFile(hybridPath, hybridContent);
    } catch (err) {
      console.log(colorize('yellow', '⚠️  Could not update hybrid Arduino sketch (file may not exist)'));
    }
    
    return true;
  } catch (err) {
    console.error(colorize('red', '❌ Failed to update Arduino code:'), err.message);
    return false;
  }
}

async function testMqttConnection(credentials) {
  console.log(colorize('blue', '\n🧪 Testing MQTT connection to HiveMQ Cloud...'));
  
  try {
    // Dynamic import to avoid issues if mqtt package isn't installed
    const mqtt = await import('mqtt');
    
    return new Promise((resolve) => {
      const client = mqtt.default.connect(`mqtts://e3dd87fcf2f74b1681d41863183a91d7.s1.eu.hivemq.cloud:8883`, {
        username: credentials.username,
        password: credentials.password,
        protocol: 'mqtts',
        rejectUnauthorized: false,
        clientId: 'pharmatrust_setup_test_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        connectTimeout: 15000,
      });
      
      const timeout = setTimeout(() => {
        client.end();
        resolve(false);
      }, 15000);
      
      client.on('connect', () => {
        clearTimeout(timeout);
        console.log(colorize('green', '✅ MQTT connection successful!'));
        client.end();
        resolve(true);
      });
      
      client.on('error', (error) => {
        clearTimeout(timeout);
        console.log(colorize('red', '❌ MQTT connection failed:'), error.message);
        client.end();
        resolve(false);
      });
    });
  } catch (err) {
    console.log(colorize('yellow', '⚠️  Cannot test MQTT connection (mqtt package not available)'));
    console.log(colorize('blue', '💡 Run: npm install mqtt (in scripts directory) to enable connection testing'));
    return null; // null means we couldn't test, not that it failed
  }
}

async function main() {
  console.log(colorize('cyan', '🏥 PharmaTrust HiveMQ Cloud Setup'));
  console.log(colorize('cyan', '=====================================\n'));
  
  console.log('This script will help you configure HiveMQ Cloud credentials for your PharmaTrust IoT system.\n');
  
  const rl = createInterface();
  
  try {
    // Get credentials
    console.log(colorize('yellow', '📋 Please provide your HiveMQ Cloud credentials:'));
    console.log(colorize('blue', '💡 Find these in your HiveMQ Cloud cluster settings\n'));
    
    const username = await question(rl, colorize('bright', 'HiveMQ Username: '));
    const password = await question(rl, colorize('bright', 'HiveMQ Password: '));
    
    if (!username || !password) {
      console.log(colorize('red', '\n❌ Username and password are required!'));
      process.exit(1);
    }
    
    const credentials = { username, password };
    
    // Test connection if possible
    const connectionTest = await testMqttConnection(credentials);
    if (connectionTest === false) {
      console.log(colorize('red', '\n❌ Connection test failed. Please verify your credentials.'));
      const continueAnyway = await question(rl, colorize('yellow', 'Continue anyway? (y/N): '));
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log(colorize('blue', '🔄 Exiting. Please verify your HiveMQ credentials and try again.'));
        process.exit(1);
      }
    }
    
    // Update .env file
    console.log(colorize('blue', '\n📝 Updating environment variables...'));
    await updateEnvFile(credentials);
    console.log(colorize('green', '✅ Environment file updated'));
    
    // Update Arduino code
    console.log(colorize('blue', '\n🔧 Updating Arduino sketches...'));
    const arduinoSuccess = await updateArduinoCode(credentials);
    if (arduinoSuccess) {
      console.log(colorize('green', '✅ Arduino code updated'));
    }
    
    // Success message
    console.log(colorize('green', '\n🎉 HiveMQ Cloud setup completed successfully!'));
    console.log(colorize('cyan', '\n📋 Next steps:'));
    console.log(colorize('blue', '1. 📱 Flash the updated Arduino code to your ESP32'));
    console.log(colorize('blue', '2. 🔌 Update WiFi credentials in the Arduino code'));
    console.log(colorize('blue', '3. 🚀 Start the system with: docker-compose up -d'));
    console.log(colorize('blue', '4. 📊 Monitor IoT data on the admin dashboard'));
    
    console.log(colorize('yellow', '\n⚠️  Important Notes:'));
    console.log(colorize('yellow', '• Make sure your ESP32 has internet connectivity'));
    console.log(colorize('yellow', '• The MQTT bridge service will forward HiveMQ data to the IoT service'));
    console.log(colorize('yellow', '• Check docker logs if you encounter connection issues'));
    
  } catch (error) {
    console.error(colorize('red', '\n❌ Setup failed:'), error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
main().catch(console.error);
