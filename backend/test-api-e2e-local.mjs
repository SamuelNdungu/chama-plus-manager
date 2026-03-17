#!/usr/bin/env node

/**
 * Local End-to-end API integration test
 * Covers auth, members, chamas, contributions, meetings
 */

import http from 'http';

const API_HOST = '127.0.0.1';
const API_PORT = 3001;

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

async function run() {
  const timestamp = Date.now();
  const email = `e2e${timestamp}@akibaplus.co.ke`;
  const username = `e2e${timestamp}`;
  const password = 'SecurePass123!';

  console.log('=========================================');
  console.log('Local E2E API Test');
  console.log('=========================================\n');

  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Auth register
  console.log('📋 Test 1: User Registration');
  testsRun++;
  const register = await httpRequest('/auth/register', 'POST', { email, password, username });
  if (register.status !== 201) {
    testsFailed++;
    console.log('❌ FAIL - Register failed:', register);
    process.exit(1);
  }
  testsPassed++;
  const accessToken = register.data.accessToken;
  const authHeader = { Authorization: `Bearer ${accessToken}` };
  console.log('✅ PASS - User registered\n');

  // Create member
  console.log('📋 Test 2: Create Member');
  testsRun++;
  const memberPayload = {
    name: 'E2E Member',
    email: `member${timestamp}@akibaplus.co.ke`,
    phone: '+254700000000',
    role: 'member',
    idNumber: `ID${timestamp}`,
    nextOfKin: { name: 'Kin', phone: '+254711111111', relationship: 'Sibling' },
  };
  const memberCreate = await httpRequest('/members', 'POST', memberPayload, authHeader);
  if (memberCreate.status !== 201) {
    testsFailed++;
    console.log('❌ FAIL - Member create failed:', memberCreate);
    process.exit(1);
  }
  testsPassed++;
  const memberId = memberCreate.data.id;
  console.log(`✅ PASS - Member created (ID: ${memberId})\n`);

  // Create chama
  console.log('📋 Test 3: Create Chama');
  testsRun++;
  const chamaPayload = {
    name: `E2E Chama ${timestamp}`,
    description: 'E2E test chama',
    contributionAmount: 1000,
    contributionFrequency: 'monthly',
  };
  const chamaCreate = await httpRequest('/chamas', 'POST', chamaPayload, authHeader);
  if (chamaCreate.status !== 201) {
    testsFailed++;
    console.log('❌ FAIL - Chama create failed:', chamaCreate);
    process.exit(1);
  }
  testsPassed++;
  const chamaId = chamaCreate.data.id;
  console.log(`✅ PASS - Chama created (ID: ${chamaId})\n`);

  // Create contribution
  console.log('📋 Test 4: Create Contribution');
  testsRun++;
  const contributionPayload = {
    chamaId,
    memberId,
    amount: 1000,
    contributionType: 'regular',
    status: 'completed',
  };
  const contributionCreate = await httpRequest('/contributions', 'POST', contributionPayload, authHeader);
  if (contributionCreate.status !== 201) {
    testsFailed++;
    console.log('❌ FAIL - Contribution create failed:', contributionCreate);
    process.exit(1);
  }
  testsPassed++;
  console.log('✅ PASS - Contribution created\n');

  // Create meeting
  console.log('📋 Test 5: Create Meeting');
  testsRun++;
  const meetingPayload = {
    chamaId,
    title: `E2E Meeting ${timestamp}`,
    meetingDate: new Date().toISOString().slice(0, 10),
    meetingTime: '18:00',
    location: 'Virtual',
    agenda: 'E2E agenda',
  };
  const meetingCreate = await httpRequest('/meetings', 'POST', meetingPayload, authHeader);
  if (meetingCreate.status !== 201) {
    testsFailed++;
    console.log('❌ FAIL - Meeting create failed:', meetingCreate);
    process.exit(1);
  }
  testsPassed++;
  console.log('✅ PASS - Meeting created\n');

  // List endpoints
  console.log('📋 Test 6: List Members');
  testsRun++;
  const listMembers = await httpRequest('/members', 'GET', null, authHeader);
  if (listMembers.status === 200) {
    testsPassed++;
    console.log(`✅ PASS - List members (${listMembers.data.length} members)\n`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL - List members failed (status: ${listMembers.status})\n`);
  }

  console.log('📋 Test 7: List Chamas');
  testsRun++;
  const listChamas = await httpRequest('/chamas', 'GET', null, authHeader);
  if (listChamas.status === 200) {
    testsPassed++;
    console.log(`✅ PASS - List chamas (${listChamas.data.length} chamas)\n`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL - List chamas failed (status: ${listChamas.status})\n`);
  }

  console.log('📋 Test 8: List Contributions');
  testsRun++;
  const listContributions = await httpRequest('/contributions', 'GET', null, authHeader);
  if (listContributions.status === 200) {
    testsPassed++;
    console.log(`✅ PASS - List contributions (${listContributions.data.length} contributions)\n`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL - List contributions failed (status: ${listContributions.status})\n`);
  }

  console.log('📋 Test 9: List Meetings');
  testsRun++;
  const listMeetings = await httpRequest('/meetings', 'GET', null, authHeader);
  if (listMeetings.status === 200) {
    testsPassed++;
    console.log(`✅ PASS - List meetings (${listMeetings.data.length} meetings)\n`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL - List meetings failed (status: ${listMeetings.status})\n`);
  }

  console.log('=========================================');
  console.log('Test Summary');
  console.log('=========================================');
  console.log(`Total Tests: ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('=========================================');
  
  if (testsFailed === 0) {
    console.log('✅ All E2E Tests Passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('E2E test error:', err);
  process.exit(1);
});
