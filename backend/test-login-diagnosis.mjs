#!/usr/bin/env node

/**
 * Simple login test - writes output to file to avoid terminal issues
 */

import http from 'http';
import fs from 'fs';

const testEmail = 's2ndungu@gmail.com';
const testPasswords = ['password123', 'Password123', 'Password123!', 'Passw0rd!', '12345678'];

function httpRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
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

async function testLogin() {
  let output = '=== Login Diagnosis ===\n\n';
  
  output += `Testing email: ${testEmail}\n\n`;
  
  // Test with common passwords
  for (const password of testPasswords) {
    try {
      const { status, data } = await httpRequest('/auth/login', 'POST', {
        email: testEmail,
        password: password,
      });
      
      output += `Password: "${password}" => Status: ${status}\n`;
      
      if (status === 200) {
        output += `  ✅ SUCCESS! This is the correct password!\n`;
        output += `  Token: ${data.accessToken?.substring(0, 20)}...\n`;
        break;
      } else {
        output += `  Message: ${data.message || data.error || 'Unknown error'}\n`;
      }
    } catch (error) {
      output += `Password: "${password}" => Error: ${error.message}\n`;
    }
    output += '\n';
  }
  
  // Check if user exists by trying to register
  output += '\n=== Checking if user exists ===\n';
  try {
    const { status, data } = await httpRequest('/auth/register', 'POST', {
      email: testEmail,
      password: 'TestPassword123!',
      username: 's2ndungu_test',
    });
    
    if (status === 409 || (data.error && data.error.includes('already exists'))) {
      output += `✅ User ${testEmail} EXISTS in database\n`;
      output += `   Error: ${data.message}\n`;
    } else if (status === 201) {
      output += `⚠️  User was just created! Use password: TestPassword123!\n`;
    } else {
      output += `❓ Unexpected response: ${JSON.stringify(data)}\n`;
    }
  } catch (error) {
    output += `Error checking user: ${error.message}\n`;
  }
  
  fs.writeFileSync('login-diagnosis.txt', output);
  console.log(output);
}

testLogin().catch(console.error);
