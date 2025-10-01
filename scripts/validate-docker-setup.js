#!/usr/bin/env node

/**
 * PharmaTrust Docker Setup Validation Script
 * Tests the complete Docker deployment without requiring local dev tools
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐳 PharmaTrust Docker Setup Validation\n');

const tests = [
  {
    name: 'Docker Engine Available',
    test: () => execSync('docker --version', { encoding: 'utf8' }),
    expected: /Docker version/
  },
  {
    name: 'Docker Compose Available', 
    test: () => execSync('docker compose version', { encoding: 'utf8' }),
    expected: /Docker Compose version/
  },
  {
    name: 'Environment File Exists',
    test: () => fs.existsSync('.env'),
    expected: true
  },
  {
    name: 'Docker Compose Config Valid',
    test: () => execSync('docker compose config --quiet', { encoding: 'utf8' }),
    expected: ''
  },
  {
    name: 'All Dockerfiles Present',
    test: () => {
      const dockerfiles = [
        'web/Dockerfile',
        'services/auth/Dockerfile', 
        'services/medicine/Dockerfile',
        'services/iot/Dockerfile',
        'services/blockchain/Dockerfile',
        'services/mobile-gateway/Dockerfile',
        'gateway/Dockerfile'
      ];
      return dockerfiles.every(f => fs.existsSync(f));
    },
    expected: true
  },
  {
    name: 'All .dockerignore Files Present',
    test: () => {
      const dockerignores = [
        'web/.dockerignore',
        'services/auth/.dockerignore',
        'services/medicine/.dockerignore', 
        'services/iot/.dockerignore',
        'services/blockchain/.dockerignore',
        'services/mobile-gateway/.dockerignore'
      ];
      return dockerignores.every(f => fs.existsSync(f));
    },
    expected: true
  },
  {
    name: 'CI/CD Pipeline Present',
    test: () => fs.existsSync('.github/workflows/docker-ci.yml'),
    expected: true
  },
  {
    name: 'Documentation Present',
    test: () => fs.existsSync('DOCKER_DEPLOYMENT.md') && fs.existsSync('Makefile'),
    expected: true
  }
];

let passed = 0;
let failed = 0;

console.log('Running validation tests...\n');

for (const test of tests) {
  try {
    const result = test.test();
    const success = test.expected instanceof RegExp 
      ? test.expected.test(result)
      : result === test.expected;
      
    if (success) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name} - Expected: ${test.expected}, Got: ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${test.name} - Error: ${error.message}`);
    failed++;
  }
}

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! Your Docker setup is ready.');
  console.log('\n🚀 Quick Start Commands:');
  console.log('  make setup    # Complete setup with demo data');
  console.log('  make up       # Start all services');
  console.log('  make health   # Check service health');
  console.log('  make help     # Show all available commands');
  console.log('\n🌐 Access URLs:');
  console.log('  Main App: http://localhost:80');
  console.log('  Database UI: http://localhost:8081 (admin/admin123)');
  console.log('\n👥 Demo Credentials:');
  console.log('  Manufacturer: mfg1 / demo123');
  console.log('  Supplier: sup1 / demo123'); 
  console.log('  Pharmacist: phm1 / demo123');
  console.log('  Admin: admin / admin123');
} else {
  console.log('⚠️  Some tests failed. Please check the issues above.');
  process.exit(1);
}
