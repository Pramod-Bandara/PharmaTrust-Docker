#!/usr/bin/env node

/**
 * PharmaTrust Production Deployment Script
 * 
 * This script automates the production deployment process for PharmaTrust.
 * It performs validation, builds, and provides deployment instructions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { locks } = require('worker_threads');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const WEB_DIR = path.join(PROJECT_ROOT, 'web');
const MOBILE_DIR = path.join(PROJECT_ROOT, 'mobile');

// Colors for console output
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function runCommand(command, cwd = PROJECT_ROOT, silent = false) {
  try {
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result;
  } catch (error) {
    logError(`Command failed: ${command}`);
    logError(error.message);
    process.exit(1);
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function validateEnvironment() {
  logStep('1', 'Validating Environment');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    logError(`Node.js 18+ required. Current version: ${nodeVersion}`);
    process.exit(1);
  }
  logSuccess(`Node.js version: ${nodeVersion}`);
  
  // Check required files
  const requiredFiles = [
    'web/package.json',
    'web/vercel.json',
    'mobile/app.json',
    'mobile/eas.json',
    '.env.production',
    'PRODUCTION_DEPLOYMENT.md'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!checkFileExists(filePath)) {
      logError(`Required file missing: ${file}`);
      process.exit(1);
    }
  }
  logSuccess('All required files present');
  
  // Check for production environment file
  const prodEnvPath = path.join(PROJECT_ROOT, '.env.production');
  if (checkFileExists(prodEnvPath)) {
    logSuccess('Production environment configuration found');
  } else {
    logWarning('Production environment file not found - using defaults');
  }
}

function buildWebApplication() {
  logStep('2', 'Building Web Application');
  
  log('Installing dependencies...', 'blue');
  runCommand('npm install', WEB_DIR, true);
  
  log('Running linter...', 'blue');
  try {
    runCommand('npm run lint', WEB_DIR, true);
    logSuccess('Linting passed');
  } catch (error) {
    logWarning('Linting warnings found (non-blocking)');
  }
  
  log('Building application...', 'blue');
  runCommand('npm run build', WEB_DIR);
  logSuccess('Web application built successfully');
}

function validateServices() {
  logStep('3', 'Validating Microservices');
  
  const services = ['auth', 'medicine', 'iot', 'blockchain', 'mobile-gateway'];
  
  for (const service of services) {
    const serviceDir = path.join(PROJECT_ROOT, 'services', service);
    const packageJsonPath = path.join(serviceDir, 'package.json');
    const dockerfilePath = path.join(serviceDir, 'Dockerfile');
    
    if (!checkFileExists(packageJsonPath)) {
      logError(`Service ${service} missing package.json`);
      continue;
    }
    
    if (!checkFileExists(dockerfilePath)) {
      logError(`Service ${service} missing Dockerfile`);
      continue;
    }
    
    logSuccess(`Service ${service} validated`);
  }
}

function validateMobileApp() {
  logStep('4', 'Validating Mobile Application');
  
  const appJsonPath = path.join(MOBILE_DIR, 'app.json');
  const easJsonPath = path.join(MOBILE_DIR, 'eas.json');
  
  if (!checkFileExists(appJsonPath)) {
    logError('Mobile app.json not found');
    return;
  }
  
  if (!checkFileExists(easJsonPath)) {
    logError('Mobile eas.json not found');
    return;
  }
  
  // Validate app.json structure
  try {
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (!appConfig.expo || !appConfig.expo.name || !appConfig.expo.slug) {
      logError('Invalid app.json structure');
      return;
    }
    logSuccess('Mobile app configuration validated');
  } catch (error) {
    logError('Invalid app.json format');
    return;
  }
}

function runTests() {
  logStep('5', 'Running Tests');
  
  log('Validating database setup...', 'blue');
  try {
    runCommand('npm run validate', path.join(PROJECT_ROOT, 'scripts'));
    logSuccess('Database validation passed');
  } catch (error) {
    logWarning('Database validation failed - may need setup');
  }
  
  log('Running integration tests...', 'blue');
  try {
    runCommand('npm run simple', path.join(PROJECT_ROOT, 'scripts'));
    logSuccess('Integration tests passed');
  } catch (error) {
    logWarning('Integration tests failed - services may not be running');
  }
}

function generateDeploymentInstructions() {
  logStep('6', 'Generating Deployment Instructions');
  
  const instructions = `
🚀 PharmaTrust Production Deployment Instructions
================================================

Your PharmaTrust application is ready for production deployment!

📋 Next Steps:

1. 🗄️  DATABASE SETUP
   • Create MongoDB Atlas cluster
   • Update connection string in environment variables
   • Run: cd scripts && npm run setup

2. 🌐 WEB APPLICATION DEPLOYMENT
   • Deploy to Vercel: cd web && npx vercel --prod
   • Or connect GitHub repository to Vercel dashboard
   • Configure environment variables in Vercel dashboard

3. 🔧 MICROSERVICES DEPLOYMENT
   Choose one option:
   
   Option A - Vercel Functions:
   • Deploy each service separately to Vercel
   • Update service URLs in environment variables
   
   Option B - Docker Containers:
   • Build containers: docker-compose build
   • Deploy to your cloud platform (AWS, GCP, Azure)
   
   Option C - Cloud Platforms:
   • Deploy to Railway, DigitalOcean, or Heroku
   • Configure environment variables for each service

4. 📱 MOBILE APP DEPLOYMENT
   • Install Expo CLI: npm install -g @expo/cli eas-cli
   • Configure: cd mobile && eas build:configure
   • Build: eas build --platform all --profile production
   • Submit: eas submit --platform all --profile production

5. 🔌 ARDUINO INTEGRATION
   WiFi Option:
   • Update Arduino code with production API URL
   • Flash PharmaTrust_IoT.ino to ESP32/ESP8266
   
   USB Option:
   • Flash PharmaTrust_USB_Fallback.ino to Arduino Uno
   • Run: cd scripts && npm run arduino [port] [api-url]

6. 🔗 BLOCKCHAIN SETUP (Optional)
   • Create thirdweb account and project
   • Deploy NFT contract on Polygon mainnet
   • Update THIRDWEB_SECRET_KEY and CONTRACT_ADDRESS

📚 Documentation:
   • Full guide: PRODUCTION_DEPLOYMENT.md
   • Environment variables: .env.production
   • Troubleshooting: See deployment guide

🔧 Environment Variables to Configure:
   • MONGODB_URI (MongoDB Atlas connection string)
   • JWT_SECRET (secure random string)
   • THIRDWEB_SECRET_KEY (blockchain integration)
   • Service URLs (after deploying microservices)

⚡ Quick Deploy Commands:
   # Web app
   cd web && npx vercel --prod
   
   # Mobile app
   cd mobile && eas build --platform all --profile production
   
   # Arduino USB forwarder
   cd scripts && npm run arduino COM3 https://your-app.vercel.app/api/iot/readings

🆘 Support:
   • Check PRODUCTION_DEPLOYMENT.md for detailed instructions
   • Validate setup: cd scripts && npm run validate
   • Test integration: cd scripts && npm run integration

================================================
✅ Deployment validation complete!
🚀 Ready for production deployment!
================================================
`;

  log(instructions, 'bright');
}

function checkDeploymentReadiness() {
  logStep('7', 'Final Deployment Readiness Check');
  
  const checks = [
    {
      name: 'Web application builds successfully',
      check: () => {
        try {
          runCommand('npm run build', WEB_DIR, true);
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'All microservices have Dockerfiles',
      check: () => {
        const services = ['auth', 'medicine', 'iot', 'blockchain', 'mobile-gateway'];
        return services.every(service => 
          checkFileExists(path.join(PROJECT_ROOT, 'services', service, 'Dockerfile'))
        );
      }
    },
    {
      name: 'Mobile app configuration is valid',
      check: () => {
        try {
          const appConfig = JSON.parse(fs.readFileSync(path.join(MOBILE_DIR, 'app.json'), 'utf8'));
          return appConfig.expo && appConfig.expo.name && appConfig.expo.slug;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Arduino USB forwarder is functional',
      check: () => {
        try {
          runCommand('node arduino-usb-forwarder.js --help', path.join(PROJECT_ROOT, 'scripts'), true);
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Production documentation exists',
      check: () => checkFileExists(path.join(PROJECT_ROOT, 'PRODUCTION_DEPLOYMENT.md'))
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (check.check()) {
      logSuccess(check.name);
    } else {
      logError(check.name);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    logSuccess('All deployment readiness checks passed!');
  } else {
    logError('Some deployment readiness checks failed. Please review and fix issues.');
    process.exit(1);
  }
}

// Main execution
async function main() {
  log('🚀 PharmaTrust Production Deployment Validator', 'bright');
  log('================================================', 'bright');
  
  try {
    validateEnvironment();
    if (!skipBuild) {
      buildWebApplication();
    } else {
      logWarning('Skipping web application build');
    }
    validateServices();
    validateMobileApp();
    if (!skipTests) {
      runTests();
    } else {
      logWarning('Skipping tests');
    }
    checkDeploymentReadiness();
    generateDeploymentInstructions();
    
    log('\n🎉 Production deployment validation completed successfully!', 'green');
    log('📖 See PRODUCTION_DEPLOYMENT.md for detailed deployment instructions.', 'blue');
    
  } catch (error) {
    logError(`Deployment validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const skipBuild = process.argv.includes('--skip-build');
const skipTests = process.argv.includes('--skip-tests');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
PharmaTrust Production Deployment Script

Usage: node deploy-production.js [options]

Options:
  --help, -h     Show this help message
  --skip-build   Skip web application build step
  --skip-tests   Skip test execution

This script validates your PharmaTrust setup for production deployment
and provides step-by-step deployment instructions.
  `);
  process.exit(0);
}

// Run main function
main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
