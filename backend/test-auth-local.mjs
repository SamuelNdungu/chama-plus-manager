#!/usr/bin/env node

/**
 * Local Authentication API Test
 * Tests against localhost backend
 */

import http from 'http';

const API_HOST = '127.0.0.1';
const API_PORT = 3001;
const timestamp = Date.now();
const testEmail = `testuser${timestamp}@akibaplus.co.ke`;
const testUsername = `testuser${timestamp}`;
const testPassword = 'SecurePass123!';

let accessToken = '';
let refreshToken = '';

function httpRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=========================================');
  console.log('Chama Plus Local Authentication API Tests');
  console.log('=========================================\n');

  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Connection
  console.log('📋 Test 1: Database Connection');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/test-db');
    if (status === 200 && data.status === 'success') {
      testsPassed++;
      console.log('✅ PASS - Database connected');
      console.log(`   Timestamp: ${data.timestamp}\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Database connection issue');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 2: User Registration
  console.log('📋 Test 2: User Registration');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Username: ${testUsername}`);
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/register', 'POST', {
      email: testEmail,
      password: testPassword,
      username: testUsername,
    });

    if (status === 201 && data.accessToken) {
      testsPassed++;
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      console.log('✅ PASS - User registered successfully');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Username: ${data.user.username}`);
      console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Registration failed');
      console.log(`   Status: ${status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 3: Token Verification
  console.log('📋 Test 3: Token Verification');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/verify', 'GET', null, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (status === 200 && data.valid) {
      testsPassed++;
      console.log('✅ PASS - Token verified successfully');
      console.log(`   User: ${data.user.username} (${data.user.email})\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Token verification failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 4: User Login
  console.log('📋 Test 4: User Login (Valid Credentials)');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword,
    });

    if (status === 200 && data.accessToken) {
      testsPassed++;
      console.log('✅ PASS - Login successful');
      console.log(`   Message: ${data.message}`);
      console.log(`   User: ${data.user.username}\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Login failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 5: Wrong Password
  console.log('📋 Test 5: Login (Wrong Password)');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword123',
    });

    if (status === 401 && data.error === 'Invalid credentials') {
      testsPassed++;
      console.log('✅ PASS - Correctly rejected wrong password');
      console.log(`   Error: ${data.message}\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Should reject wrong password');
      console.log(`   Status: ${status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 6: Token Refresh
  console.log('📋 Test 6: Token Refresh');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/refresh', 'POST', {
      refreshToken,
    });

    if (status === 200 && data.accessToken) {
      testsPassed++;
      console.log('✅ PASS - Token refreshed successfully');
      console.log(`   New Token: ${data.accessToken.substring(0, 20)}...\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Token refresh failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 7: Invalid Token
  console.log('📋 Test 7: Invalid Token Handling');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/verify', 'GET', null, {
      Authorization: 'Bearer invalid_token_12345',
    });

    if (status === 403 && data.error === 'Invalid token') {
      testsPassed++;
      console.log('✅ PASS - Correctly rejected invalid token');
      console.log(`   Error: ${data.message}\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Should reject invalid token');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 8: Missing Token
  console.log('📋 Test 8: Missing Token Handling');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/verify', 'GET');

    if (status === 401 && data.error === 'Authentication required') {
      testsPassed++;
      console.log('✅ PASS - Correctly rejected missing token');
      console.log(`   Error: ${data.message}\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Should reject missing token');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 9: Duplicate Registration
  console.log('📋 Test 9: Duplicate Registration Prevention');
  testsRun++;
  try {
    const { status, data } = await httpRequest('/auth/register', 'POST', {
      email: testEmail,
      password: testPassword,
      username: testUsername,
    });

    if (status === 409 && data.error === 'User already exists') {
      testsPassed++;
      console.log('✅ PASS - Correctly prevented duplicate registration');
      console.log(`   Error: ${data.message}\n`);
    } else {
      testsFailed++;
      console.log('❌ FAIL - Should prevent duplicate registration');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  console.log('=========================================');
  console.log('Test Summary');
  console.log('=========================================');
  console.log(`Total Tests: ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('=========================================');
  
  if (testsFailed === 0) {
    console.log('✅ All Authentication Tests Passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.');
    process.exit(1);
  }
}

runTests().catch(console.error);
