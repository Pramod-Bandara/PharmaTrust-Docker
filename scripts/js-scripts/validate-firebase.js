#!/usr/bin/env node

/**
 * PharmaTrust Firebase Configuration Validator
 * Validates Firebase environment variables and configuration
 */

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    header: '🔥'
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'header');
  console.log('='.repeat(60));
}

function validateFirebaseConfig() {
  printHeader('Firebase Configuration Validator');
  
  const requiredClientVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const requiredServerVars = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL'
  ];

  let allValid = true;

  // Check client config
  log('Checking client-side Firebase configuration...');
  for (const envVar of requiredClientVars) {
    if (process.env[envVar]) {
      log(`${envVar}: ✓ Present`, 'success');
    } else {
      log(`${envVar}: ✗ Missing`, 'error');
      allValid = false;
    }
  }

  // Check server config
  log('\nChecking server-side Firebase Admin configuration...');
  for (const envVar of requiredServerVars) {
    if (process.env[envVar]) {
      log(`${envVar}: ✓ Present`, 'success');
    } else {
      log(`${envVar}: ✗ Missing`, 'error');
      allValid = false;
    }
  }

  // Check auth mode
  log('\nChecking authentication mode...');
  const explicitAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE;
  const demoMode = process.env.DEMO_MODE === 'true';

  let authMode;
  if (explicitAuthMode === 'firebase') {
    authMode = 'firebase';
    log('NEXT_PUBLIC_AUTH_MODE: ✓ Firebase mode explicitly set', 'success');
  } else if (explicitAuthMode === 'demo') {
    authMode = 'demo';
    log('NEXT_PUBLIC_AUTH_MODE: ✓ Demo mode explicitly set', 'success');
  } else if (demoMode) {
    authMode = 'demo';
    log('DEMO_MODE: ✓ Demo mode active (DEMO_MODE=true)', 'success');
  } else {
    authMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'firebase' : 'demo';
    log(`NEXT_PUBLIC_AUTH_MODE: Auto-detected as ${authMode} based on Firebase config`, 'info');
  }

  // Only show Firebase setup instructions if not in demo mode
  const needsFirebaseSetup = !allValid && authMode !== 'demo';

  if (needsFirebaseSetup) {
    printHeader('Firebase Setup Instructions');
    console.log('\n1. Create Firebase Project:');
    console.log('   - Go to https://console.firebase.google.com/');
    console.log('   - Create new project or use existing');
    console.log('   - Enable Authentication with Email/Password and Google providers');
    
    console.log('\n2. Get Client Configuration:');
    console.log('   - Project Settings → General → Your Apps → Web app');
    console.log('   - Copy config values to your .env file');
    
    console.log('\n3. Get Service Account Key:');
    console.log('   - Project Settings → Service Accounts → Generate New Private Key');
    console.log('   - Add private key data to .env file');
    
    console.log('\n4. Example .env configuration:');
    console.log(`
NEXT_PUBLIC_AUTH_MODE=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
`);
  }

  return allValid;
}

async function testFirebaseConnection() {
  try {
    // Only test if we have the required variables
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
      log('Skipping Firebase connection test - admin config not present', 'warning');
      return false;
    }

    log('Testing Firebase Admin SDK connection...');
    
    // Dynamic import to avoid errors if firebase-admin isn't installed
    const { initializeApp, getApps, cert } = require('firebase-admin/app');
    const { getAuth } = require('firebase-admin/auth');

    if (getApps().length === 0) {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        }),
      });
    }

    const auth = getAuth();
    
    // Test basic functionality
    await auth.listUsers(1);
    
    log('Firebase Admin SDK connection: ✓ Success', 'success');
    return true;
  } catch (error) {
    log(`Firebase Admin SDK connection: ✗ Failed - ${error.message}`, 'error');
    return false;
  }
}

async function validateFirebase() {
  try {
    const configValid = validateFirebaseConfig();
    const isDemoMode = ['demo', 'demo'].includes(process.env.NEXT_PUBLIC_AUTH_MODE) || process.env.DEMO_MODE === 'true';

    if (isDemoMode) {
      printHeader('Demo Mode Validation Complete');
      log('🎉 Demo mode is active!', 'success');
      log('Firebase authentication is disabled - using demo credentials', 'success');
      log('Demo users: mfg1/demo123, sup1/demo123, phm1/demo123, admin/admin123', 'info');
      return;
    }

    if (configValid) {
      const connectionValid = await testFirebaseConnection();

      if (configValid && connectionValid) {
        printHeader('Firebase Validation Complete');
        log('🎉 Firebase configuration is valid and working!', 'success');
        log('You can now use Firebase authentication in PharmaTrust', 'success');
      } else {
        log('Firebase configuration is present but connection failed', 'warning');
        log('Check your service account credentials', 'warning');
      }
    } else {
      log('❌ Firebase configuration is incomplete', 'error');
      log('Please configure Firebase environment variables', 'error');
    }
  } catch (error) {
    log(`Validation failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Command line options
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
PharmaTrust Firebase Configuration Validator

Usage: node validate-firebase.js [options]

Options:
  --help, -h      Show this help message

This script will:
1. Validate Firebase environment variables
2. Test Firebase Admin SDK connection
3. Provide setup instructions if needed

Make sure to run this script with environment variables loaded:
  source .env && node validate-firebase.js
`);
  process.exit(0);
}

// Run validation if called directly
if (require.main === module) {
  validateFirebase().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { validateFirebaseConfig, testFirebaseConnection, validateFirebase };
