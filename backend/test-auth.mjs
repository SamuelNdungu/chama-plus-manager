/**
 * Authentication API Test Suite
 * Tests all authentication endpoints
 */

import fetch from 'node-fetch';

const API_URL = 'https://akibaplus.bima-connect.co.ke/api';
const timestamp = Date.now();
const testEmail = `testuser${timestamp}@akibaplus.co.ke`;
const testUsername = `testuser${timestamp}`;
const testPassword = 'SecurePass123!';

let accessToken = '';
let refreshToken = '';

async function testAPI() {
  console.log('=========================================');
  console.log('Testing Chama Plus Authentication API');
  console.log('=========================================\n');

  // Test 1: Database Connection
  console.log('1. Testing database connection...');
  try {
    const response = await fetch(`${API_URL}/test-db`);
    const data = await response.json();
    console.log('✓ Database connection successful');
    console.log(`  Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return;
  }
  console.log('');

  // Test 2: User Registration
  console.log('2. Testing user registration...');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Username: ${testUsername}`);
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        username: testUsername,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Registration failed:', JSON.stringify(error, null, 2));
      return;
    }

    const data = await response.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    
    console.log('✓ Registration successful!');
    console.log(`  User ID: ${data.user.id}`);
    console.log(`  Email: ${data.user.email}`);
    console.log(`  Username: ${data.user.username}`);
    console.log(`  Access Token: ${accessToken.substring(0, 20)}...`);
  } catch (error) {
    console.log('❌ Registration failed:', error.message);
    return;
  }
  console.log('');

  // Test 3: Token Verification
  console.log('3. Testing token verification...');
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (data.valid) {
      console.log('✓ Token verification successful!');
      console.log(`  User: ${data.user.username} (${data.user.email})`);
    } else {
      console.log('❌ Token verification failed');
    }
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
  }
  console.log('');

  // Test 4: User Login
  console.log('4. Testing user login...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Login failed:', JSON.stringify(error, null, 2));
    } else {
      const data = await response.json();
      console.log('✓ Login successful!');
      console.log(`  Message: ${data.message}`);
      console.log(`  User: ${data.user.username}`);
    }
  } catch (error) {
    console.log('❌ Login failed:', error.message);
  }
  console.log('');

  // Test 5: Wrong Password
  console.log('5. Testing login with wrong password...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123',
      }),
    });

    const data = await response.json();
    if (!response.ok && data.error === 'Invalid credentials') {
      console.log('✓ Correctly rejected wrong password');
      console.log(`  Error: ${data.message}`);
    } else {
      console.log('❌ Should have rejected wrong password');
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  console.log('');

  // Test 6: Token Refresh
  console.log('6. Testing token refresh...');
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Token refresh failed:', JSON.stringify(error, null, 2));
    } else {
      const data = await response.json();
      console.log('✓ Token refresh successful!');
      console.log(`  New Access Token: ${data.accessToken.substring(0, 20)}...`);
    }
  } catch (error) {
    console.log('❌ Token refresh failed:', error.message);
  }
  console.log('');

  // Test 7: Invalid Token
  console.log('7. Testing with invalid token...');
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'Authorization': 'Bearer invalid_token_12345' },
    });

    const data = await response.json();
    if (!response.ok && data.error === 'Invalid token') {
      console.log('✓ Correctly rejected invalid token');
      console.log(`  Error: ${data.message}`);
    } else {
      console.log('❌ Should have rejected invalid token');
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  console.log('');

  // Test 8: Missing Token
  console.log('8. Testing without token...');
  try {
    const response = await fetch(`${API_URL}/auth/verify`);
    const data = await response.json();
    
    if (!response.ok && data.error === 'Authentication required') {
      console.log('✓ Correctly rejected missing token');
      console.log(`  Error: ${data.message}`);
    } else {
      console.log('❌ Should have rejected missing token');
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  console.log('');

  console.log('=========================================');
  console.log('✓ All authentication tests completed!');
  console.log('=========================================');
}

// Install node-fetch if needed
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  testAPI();
} catch (error) {
  console.error('Test suite error:', error.message);
  if (error.message.includes('node-fetch')) {
    console.log('\nPlease install node-fetch:');
    console.log('  npm install node-fetch');
  }
}
