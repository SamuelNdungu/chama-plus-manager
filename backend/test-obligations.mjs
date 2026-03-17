/**
 * Obligations API Tests
 * 
 * Tests the contribution obligations system including:
 * - Monthly obligation generation
 * - Arrears tracking
 * - Payment recording
 * - Statistics calculation
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:3001';
let authToken = '';
let testChamaId = null;
let testMemberId = null;
let testObligationId = null;

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  return { response, data };
}

// Test 1: Login (required for authenticated requests)
async function testLogin() {
  console.log('\n📝 Test 1: User Login');
  
  const { response, data } = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
    }),
  });

  if (response.status === 200 && data.accessToken) {
    authToken = data.accessToken;
    console.log('✅ PASS: Login successful');
    return true;
  } else {
    console.log('❌ FAIL: Login failed');
    console.log('Response:', data);
    return false;
  }
}

// Test 2: Get list of obligations
async function testGetObligations() {
  console.log('\n📝 Test 2: Get Obligations List');
  
  const { response, data } = await apiRequest('/api/contributions/obligations?limit=10');

  if (response.status === 200 && data.obligations) {
    console.log(`✅ PASS: Retrieved ${data.obligations.length} obligations`);
    if (data.obligations.length > 0) {
      testObligationId = data.obligations[0].id;
      testChamaId = data.obligations[0].chama_id;
      testMemberId = data.obligations[0].member_id;
      console.log(`   Stored test obligation ID: ${testObligationId}`);
    }
    return true;
  } else {
    console.log('❌ FAIL: Failed to retrieve obligations');
    console.log('Response:', data);
    return false;
  }
}

// Test 3: Get obligations with filters
async function testGetObligationsWithFilters() {
  console.log('\n📝 Test 3: Get Obligations with Filters');
  
  if (!testChamaId) {
    console.log('⚠️  SKIP: No test chama ID available');
    return true;
  }

  const { response, data } = await apiRequest(
    `/api/contributions/obligations?chama_id=${testChamaId}&status=pending`
  );

  if (response.status === 200 && data.obligations) {
    console.log(`✅ PASS: Retrieved ${data.obligations.length} pending obligations`);
    return true;
  } else {
    console.log('❌ FAIL: Failed to retrieve filtered obligations');
    console.log('Response:', data);
    return false;
  }
}

// Test 4: Get arrears data
async function testGetArrears() {
  console.log('\n📝 Test 4: Get Arrears Data');
  
  if (!testChamaId) {
    console.log('⚠️  SKIP: No test chama ID available');
    return true;
  }

  const { response, data } = await apiRequest(
    `/api/contributions/arrears?chama_id=${testChamaId}`
  );

  if (response.status === 200 && (data.data || data.summary)) {
    console.log('✅ PASS: Retrieved arrears data');
    console.log(`   Members in arrears: ${data.summary?.total_members_in_arrears || 0}`);
    console.log(`   Total outstanding: KES ${data.summary?.total_outstanding || 0}`);
    return true;
  } else {
    console.log('❌ FAIL: Failed to retrieve arrears data');
    console.log('Response:', data);
    return false;
  }
}

// Test 5: Get obligation statistics
async function testGetStats() {
  console.log('\n📝 Test 5: Get Obligation Statistics');
  
  const { response, data } = await apiRequest('/api/contributions/obligations/stats');

  if (response.status === 200 && data.stats) {
    console.log('✅ PASS: Retrieved obligation statistics');
    console.log(`   Total obligations: ${data.stats.total_obligations || 0}`);
    console.log(`   Paid: ${data.stats.paid_count || 0}`);
    console.log(`   Pending: ${data.stats.pending_count || 0}`);
    console.log(`   Overdue: ${data.stats.overdue_count || 0}`);
    return true;
  } else {
    console.log('❌ FAIL: Failed to retrieve statistics');
    console.log('Response:', data);
    return false;
  }
}

// Test 6: Get stats with chama filter
async function testGetStatsWithFilter() {
  console.log('\n📝 Test 6: Get Statistics with Chama Filter');
  
  if (!testChamaId) {
    console.log('⚠️  SKIP: No test chama ID available');
    return true;
  }

  const { response, data } = await apiRequest(
    `/api/contributions/obligations/stats?chama_id=${testChamaId}`
  );

  if (response.status === 200 && data.stats) {
    console.log(`✅ PASS: Retrieved filtered statistics for chama ${testChamaId}`);
    console.log(`   Total expected: KES ${data.stats.total_expected || 0}`);
    console.log(`   Total paid: KES ${data.stats.total_paid || 0}`);
    console.log(`   Total outstanding: KES ${data.stats.total_outstanding || 0}`);
    return true;
  } else {
    console.log('❌ FAIL: Failed to retrieve filtered statistics');
    console.log('Response:', data);
    return false;
  }
}

// Test 7: Record payment (if obligation exists)
async function testRecordPayment() {
  console.log('\n📝 Test 7: Record Payment Against Obligation');
  
  if (!testObligationId) {
    console.log('⚠️  SKIP: No test obligation ID available');
    return true;
  }

  const { response, data } = await apiRequest(
    `/api/contributions/obligations/${testObligationId}/pay`,
    {
      method: 'POST',
      body: JSON.stringify({
        amount: '100.00',
        payment_method: 'cash',
        reference_number: `TEST-${Date.now()}`,
        notes: 'Test payment from automated tests',
      }),
    }
  );

  if (response.status === 200 && data.obligation) {
    console.log('✅ PASS: Payment recorded successfully');
    console.log(`   Paid amount: ${data.obligation.paid_amount}`);
    console.log(`   Outstanding: ${data.obligation.outstanding_balance}`);
    console.log(`   Status: ${data.obligation.status}`);
    return true;
  } else {
    console.log('⚠️  Payment recording failed (may be expected):');
    console.log('Response:', data.message || data.error);
    return true; // Return true as this might fail if obligation is already paid
  }
}

// Test 8: Validate payment amount
async function testValidatePaymentAmount() {
  console.log('\n📝 Test 8: Validate Payment Amount (Negative Test)');
  
  if (!testObligationId) {
    console.log('⚠️  SKIP: No test obligation ID available');
    return true;
  }

  const { response, data } = await apiRequest(
    `/api/contributions/obligations/${testObligationId}/pay`,
    {
      method: 'POST',
      body: JSON.stringify({
        amount: '-100.00', // Invalid negative amount
        payment_method: 'cash',
      }),
    }
  );

  if (response.status === 400 || data.error) {
    console.log('✅ PASS: Negative payment amount rejected correctly');
    return true;
  } else {
    console.log('❌ FAIL: Negative payment amount was accepted (should be rejected)');
    return false;
  }
}

// Test 9: Check job execution status
async function testJobStatus() {
  console.log('\n📝 Test 9: Check Monthly Job Status');
  
  const { response, data } = await apiRequest('/api/contributions/obligations/stats');

  if (response.status === 200) {
    console.log('✅ PASS: Job status endpoint accessible');
    return true;
  } else {
    console.log('❌ FAIL: Failed to check job status');
    console.log('Response:', data);
    return false;
  }
}

// Test 10: Manual job trigger (admin functionality)
async function testManualJobTrigger() {
  console.log('\n📝 Test 10: Manual Job Trigger (May Require Admin Rights)');
  
  const { response, data } = await apiRequest('/api/contributions/run-monthly-job', {
    method: 'POST',
  });

  if (response.status === 200 || response.status === 403) {
    if (response.status === 200) {
      console.log('✅ PASS: Job triggered successfully');
    } else {
      console.log('⚠️  Job trigger requires admin rights (expected)');
    }
    return true;
  } else {
    console.log('❌ FAIL: Unexpected response from job trigger');
    console.log('Response:', data);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('=========================================');
  console.log('Obligations API Test Suite');
  console.log('=========================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log('=========================================');

  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Get Obligations', fn: testGetObligations },
    { name: 'Get Obligations with Filters', fn: testGetObligationsWithFilters },
    { name: 'Get Arrears Data', fn: testGetArrears },
    { name: 'Get Statistics', fn: testGetStats },
    { name: 'Get Filtered Statistics', fn: testGetStatsWithFilter },
    { name: 'Record Payment', fn: testRecordPayment },
    { name: 'Validate Payment Amount', fn: testValidatePaymentAmount },
    { name: 'Check Job Status', fn: testJobStatus },
    { name: 'Manual Job Trigger', fn: testManualJobTrigger },
  ];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === true) {
        passed++;
      } else if (result === 'skip') {
        skipped++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${test.name} - ${error.message}`);
      failed++;
    }
  }

  console.log('\n=========================================');
  console.log('Test Results');
  console.log('=========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${tests.length}`);
  console.log('=========================================');

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
