#!/usr/bin/env node

/**
 * End-to-end API integration test
 * Covers auth, members, chamas, contributions, meetings
 */

import https from 'https';

const API_HOST = 'akibaplus.bima-connect.co.ke';

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

async function run() {
  const timestamp = Date.now();
  const email = `e2e${timestamp}@akibaplus.co.ke`;
  const username = `e2e${timestamp}`;
  const password = 'SecurePass123!';

  console.log('=== E2E API Test Start ===');

  // Auth register
  const register = await httpsRequest('/auth/register', 'POST', { email, password, username });
  if (register.status !== 201) {
    console.log('Register failed:', register);
    process.exit(1);
  }
  const accessToken = register.data.accessToken;
  const authHeader = { Authorization: `Bearer ${accessToken}` };
  console.log('Auth register OK');

  // Create member
  const memberPayload = {
    name: 'E2E Member',
    email: `member${timestamp}@akibaplus.co.ke`,
    phone: '+254700000000',
    role: 'member',
    idNumber: `ID${timestamp}`,
    nextOfKin: { name: 'Kin', phone: '+254711111111', relationship: 'Sibling' },
  };
  const memberCreate = await httpsRequest('/members', 'POST', memberPayload, authHeader);
  if (memberCreate.status !== 201) {
    console.log('Member create failed:', memberCreate);
    process.exit(1);
  }
  const memberId = memberCreate.data.id;
  console.log('Member create OK');

  // Create chama
  const chamaPayload = {
    name: `E2E Chama ${timestamp}`,
    description: 'E2E test chama',
    contributionAmount: 1000,
    contributionFrequency: 'monthly',
  };
  const chamaCreate = await httpsRequest('/chamas', 'POST', chamaPayload, authHeader);
  if (chamaCreate.status !== 201) {
    console.log('Chama create failed:', chamaCreate);
    process.exit(1);
  }
  const chamaId = chamaCreate.data.id;
  console.log('Chama create OK');

  // Create contribution
  const contributionPayload = {
    chamaId,
    memberId,
    amount: 1000,
    contributionType: 'regular',
    status: 'completed',
  };
  const contributionCreate = await httpsRequest('/contributions', 'POST', contributionPayload, authHeader);
  if (contributionCreate.status !== 201) {
    console.log('Contribution create failed:', contributionCreate);
    process.exit(1);
  }
  console.log('Contribution create OK');

  // Create meeting
  const meetingPayload = {
    chamaId,
    title: `E2E Meeting ${timestamp}`,
    meetingDate: new Date().toISOString().slice(0, 10),
    meetingTime: '18:00',
    location: 'Virtual',
    agenda: 'E2E agenda',
  };
  const meetingCreate = await httpsRequest('/meetings', 'POST', meetingPayload, authHeader);
  if (meetingCreate.status !== 201) {
    console.log('Meeting create failed:', meetingCreate);
    process.exit(1);
  }
  console.log('Meeting create OK');

  // List endpoints
  const listMembers = await httpsRequest('/members', 'GET', null, authHeader);
  const listChamas = await httpsRequest('/chamas', 'GET', null, authHeader);
  const listContributions = await httpsRequest('/contributions', 'GET', null, authHeader);
  const listMeetings = await httpsRequest('/meetings', 'GET', null, authHeader);

  console.log('List members:', listMembers.status);
  console.log('List chamas:', listChamas.status);
  console.log('List contributions:', listContributions.status);
  console.log('List meetings:', listMeetings.status);

  console.log('=== E2E API Test Complete ===');
}

run().catch((err) => {
  console.error('E2E test error:', err);
  process.exit(1);
});
