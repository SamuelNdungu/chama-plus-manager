#!/usr/bin/env node

/**
 * Simple Authentication API Test
 * Uses built-in https module - no external dependencies
 */

import https from 'https';

const API_HOST = 'akibaplus.bima-connect.co.ke';
const timestamp = Date.now();
const testEmail = `testuser${timestamp}@akibaplus.co.ke`;
const testUsername = `testuser${timestamp}`;
const testPassword = 'SecurePass123!';

let accessToken = '';
let refreshToken = '';

function httpsRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
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
  console.log('Chama Plus Authentication API Tests');
  console.log('=========================================\n');

  // Test 1: Database Connection
  console.log('📋 Test 1: Database Connection');
  try {
    const { status, data } = await httpsRequest('/test-db');
    if (status === 200 && data.status === 'success') {
      console.log('✅ PASS - Database connected');
      console.log(`   Timestamp: ${data.timestamp}\n`);
    } else {
      console.log('❌ FAIL - Database connection issue');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 2: User Registration
  console.log('📋 Test 2: User Registration');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Username: ${testUsername}`);
  try {
    const { status, data } = await httpsRequest('/auth/register', 'POST', {
      email: testEmail,
      password: testPassword,
      username: testUsername,
    });

    if (status === 201 && data.accessToken) {
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      console.log('✅ PASS - User registered successfully');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Username: ${data.user.username}`);
      console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);
    } else {
      console.log('❌ FAIL - Registration failed');
      console.log(`   Status: ${status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
    process.exit(1);
  }

  // Test 3: Token Verification
  console.log('📋 Test 3: Token Verification');
  try {
    const { status, data } = await httpsRequest('/auth/verify', 'GET', null, {
      Authorization: `Bearer ${accessToken}`,
    });

    if (status === 200 && data.valid) {
      console.log('✅ PASS - Token verified successfully');
      console.log(`   User: ${data.user.username} (${data.user.email})\n`);
    } else {
      console.log('❌ FAIL - Token verification failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 4: User Login
  console.log('📋 Test 4: User Login (Valid Credentials)');
  try {
    const { status, data } = await httpsRequest('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword,
    });

    if (status === 200 && data.accessToken) {
      console.log('✅ PASS - Login successful');
      console.log(`   Message: ${data.message}`);
      console.log(`   User: ${data.user.username}\n`);
    } else {
      console.log('❌ FAIL - Login failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 5: Wrong Password
  console.log('📋 Test 5: Login (Wrong Password)');
  try {
    const { status, data } = await httpsRequest('/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword123',
    });

    if (status === 401 && data.error === 'Invalid credentials') {
      console.log('✅ PASS - Correctly rejected wrong password');
      console.log(`   Error: ${data.message}\n`);
    } else {
      console.log('❌ FAIL - Should reject wrong password');
      console.log(`   Status: ${status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 6: Token Refresh
  console.log('📋 Test 6: Token Refresh');
  try {
    const { status, data } = await httpsRequest('/auth/refresh', 'POST', {
      refreshToken,
    });

    if (status === 200 && data.accessToken) {
      console.log('✅ PASS - Token refreshed successfully');
      console.log(`   New Token: ${data.accessToken.substring(0, 20)}...\n`);
    } else {
      console.log('❌ FAIL - Token refresh failed');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 7: Invalid Token
  console.log('📋 Test 7: Invalid Token Handling');
  try {
    const { status, data } = await httpsRequest('/auth/verify', 'GET', null, {
      Authorization: 'Bearer invalid_token_12345',
    });

    if (status === 403 && data.error === 'Invalid token') {
      console.log('✅ PASS - Correctly rejected invalid token');
      console.log(`   Error: ${data.message}\n`);
    } else {
      console.log('❌ FAIL - Should reject invalid token');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 8: Missing Token
  console.log('📋 Test 8: Missing Token Handling');
  try {
    const { status, data } = await httpsRequest('/auth/verify', 'GET');

    if (status === 401 && data.error === 'Authentication required') {
      console.log('✅ PASS - Correctly rejected missing token');
      console.log(`   Error: ${data.message}\n`);
    } else {
      console.log('❌ FAIL - Should reject missing token');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  // Test 9: Duplicate Registration
  console.log('📋 Test 9: Duplicate Registration Prevention');
  try {
    const { status, data } = await httpsRequest('/auth/register', 'POST', {
      email: testEmail,
      password: testPassword,
      username: testUsername,
    });

    if (status === 409 && data.error === 'User already exists') {
      console.log('✅ PASS - Correctly prevented duplicate registration');
      console.log(`   Error: ${data.message}\n`);
    } else {
      console.log('❌ FAIL - Should prevent duplicate registration');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (error) {
    console.log(`❌ FAIL - ${error.message}\n`);
  }

  console.log('=========================================');
  console.log('✅ All Authentication Tests Completed!');
  console.log('=========================================');
}

runTests().catch(console.error);
