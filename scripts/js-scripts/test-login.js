#!/usr/bin/env node

/**
 * PharmaTrust Login Test Script
 *
 * Tests login functionality for:
 * 1. Demo users (mfg1, sup1, phm1, admin)
 * 2. Newly created users via API
 *
 * This verifies that the bcrypt password hashing migration is working correctly.
 *
 * Usage: node test-login.js [--base-url http://localhost:3000]
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.argv.find(arg => arg.startsWith('--base-url='))?.split('=')[1] ||
                 process.env.BASE_URL ||
                 'http://localhost:3000';

// Test users
const DEMO_USERS = [
  { username: 'mfg1', password: 'demo123', role: 'manufacturer' },
  { username: 'sup1', password: 'demo123', role: 'supplier' },
  { username: 'phm1', password: 'demo123', role: 'pharmacist' },
  { username: 'admin', password: 'admin123', role: 'admin' }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case 'success':
      console.log(`${colors.green}✅ [${timestamp}] ${message}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.red}❌ [${timestamp}] ${message}${colors.reset}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}⚠️  [${timestamp}] ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.cyan}ℹ️  [${timestamp}] ${message}${colors.reset}`);
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
}

async function testLogin(username, password, expectedRole) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    });

    if (response.status === 200 && response.data.token) {
      const user = response.data.user;

      // Verify user data
      if (user.username !== username) {
        log(`Login succeeded but username mismatch: expected ${username}, got ${user.username}`, 'error');
        return false;
      }

      if (user.role !== expectedRole) {
        log(`Login succeeded but role mismatch: expected ${expectedRole}, got ${user.role}`, 'error');
        return false;
      }

      log(`Login successful for ${username} (${user.role})`, 'success');
      log(`  Token: ${response.data.token.substring(0, 20)}...`, 'info');
      log(`  Entity: ${user.entityName}`, 'info');
      return true;
    } else {
      log(`Login failed for ${username}: Unexpected response`, 'error');
      return false;
    }
  } catch (error) {
    if (error.response) {
      log(`Login failed for ${username}: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`, 'error');
    } else if (error.request) {
      log(`Login failed for ${username}: No response from server`, 'error');
    } else {
      log(`Login failed for ${username}: ${error.message}`, 'error');
    }
    return false;
  }
}

async function createTestUser(adminToken) {
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = 'TestPass123!';

  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/users`,
      {
        username: testUsername,
        password: testPassword,
        role: 'manufacturer',
        entityName: 'Test Manufacturing Co.'
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    if (response.status === 201) {
      log(`Created test user: ${testUsername}`, 'success');
      return { username: testUsername, password: testPassword, role: 'manufacturer' };
    }
  } catch (error) {
    if (error.response) {
      log(`Failed to create test user: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`, 'error');
    } else {
      log(`Failed to create test user: ${error.message}`, 'error');
    }
  }

  return null;
}

async function deleteTestUser(adminToken, username) {
  try {
    await axios.delete(
      `${BASE_URL}/api/auth/users/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );
    log(`Deleted test user: ${username}`, 'success');
  } catch (error) {
    log(`Failed to delete test user ${username}: ${error.message}`, 'warning');
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}PharmaTrust Login Test${colors.reset}`);
  console.log(`${colors.blue}Base URL: ${BASE_URL}${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  let passedTests = 0;
  let failedTests = 0;
  let adminToken = null;
  let testUser = null;

  try {
    // Test 1: Check server health
    log('Testing server health...', 'info');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/auth/health`);
      if (healthResponse.data.ok) {
        log('Auth service is healthy', 'success');
      }
    } catch (error) {
      log('Auth service health check failed - server may not be running', 'error');
      log('Please ensure Docker services are running: make up', 'warning');
      process.exit(1);
    }

    console.log('\n' + '-'.repeat(60));
    log('Test Suite 1: Demo User Login', 'info');
    console.log('-'.repeat(60) + '\n');

    // Test 2-5: Test demo user logins
    for (const user of DEMO_USERS) {
      const success = await testLogin(user.username, user.password, user.role);
      if (success) {
        passedTests++;

        // Save admin token for later tests
        if (user.role === 'admin') {
          const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: user.username,
            password: user.password
          });
          adminToken = response.data.token;
        }
      } else {
        failedTests++;
      }
      console.log('');
    }

    // Test 6: Test invalid credentials
    console.log('-'.repeat(60));
    log('Test Suite 2: Invalid Credentials', 'info');
    console.log('-'.repeat(60) + '\n');

    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'mfg1',
        password: 'wrongpassword'
      });
      log('Invalid credentials test FAILED - should have been rejected', 'error');
      failedTests++;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        log('Invalid credentials correctly rejected', 'success');
        passedTests++;
      } else {
        log('Invalid credentials test FAILED - unexpected error', 'error');
        failedTests++;
      }
    }
    console.log('');

    // Test 7-8: Test new user creation and login
    if (adminToken) {
      console.log('-'.repeat(60));
      log('Test Suite 3: New User Creation & Login', 'info');
      console.log('-'.repeat(60) + '\n');

      log('Creating new test user...', 'info');
      testUser = await createTestUser(adminToken);

      if (testUser) {
        passedTests++;
        console.log('');

        log('Testing login with newly created user...', 'info');
        const loginSuccess = await testLogin(testUser.username, testUser.password, testUser.role);

        if (loginSuccess) {
          log('New user login test PASSED - bcrypt hashing is working correctly!', 'success');
          passedTests++;
        } else {
          log('New user login test FAILED - user was created but cannot login', 'error');
          failedTests++;
        }
        console.log('');
      } else {
        log('Failed to create test user - skipping new user login test', 'warning');
        failedTests += 2;
      }
    } else {
      log('No admin token available - skipping new user tests', 'warning');
      failedTests += 2;
    }

    // Cleanup
    if (adminToken && testUser) {
      log('Cleaning up test user...', 'info');
      await deleteTestUser(adminToken, testUser.username);
      console.log('');
    }

  } catch (error) {
    log(`Unexpected error during tests: ${error.message}`, 'error');
    failedTests++;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Total:  ${passedTests + failedTests}`);
  console.log('='.repeat(60) + '\n');

  if (failedTests === 0) {
    log('All tests passed! ✨', 'success');
    log('Both demo users and newly created users can login successfully.', 'success');
    process.exit(0);
  } else {
    log('Some tests failed. Please review the errors above.', 'error');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testLogin, createTestUser, deleteTestUser };
