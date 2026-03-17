#!/usr/bin/env node

/**
 * Contribution Obligations System - Comprehensive Test Suite
 * Tests automated obligation generation, payment recording, arrears calculation
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'chama_app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'chamaPlus',
});

// Test data
let testChamaId;
let testMember1Id;
let testMember2Id;
let testObligationId;

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logTest(testName) {
  console.log(`\n${BLUE}▶ ${testName}${RESET}`);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, GREEN);
}

function logError(message) {
  log(`  ✗ ${message}`, RED);
}

function logInfo(message) {
  log(`  ℹ ${message}`, YELLOW);
}

// Setup: Create test data
async function setupTestData() {
  logTest('SETUP: Creating test data');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create test chama
    const chamaResult = await client.query(`
      INSERT INTO chamas (name, description, registration_number, 
        contribution_frequency, contribution_amount, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, ['Test Obligations Chama', 'For testing obligations', 'TEST-OBL-' + Date.now(), 'monthly', 1100]);
    
    testChamaId = chamaResult.rows[0].id;
    logSuccess(`Created test chama (ID: ${testChamaId})`);
    
    // Create contribution rule
    await client.query(`
      INSERT INTO contribution_rules (chama_id, amount, currency_code, frequency, 
        effective_from, effective_to, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NULL, NOW(), NOW())
    `, [testChamaId, 1100.00, 'KES', 'monthly', '2026-01-01']);
    
    logSuccess('Created contribution rule (KES 1100)');
    
    // Create test members
    const member1Result = await client.query(`
      INSERT INTO members (name, email, phone, id_number, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, ['Test Member 1', 'testmember1@test.com', '+254700000001', '11111111', 'member']);
    
    testMember1Id = member1Result.rows[0].id;
    logSuccess(`Created test member 1 (ID: ${testMember1Id})`);
    
    const member2Result = await client.query(`
      INSERT INTO members (name, email, phone, id_number, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, ['Test Member 2', 'testmember2@test.com', '+254700000002', '22222222', 'member']);
    
    testMember2Id = member2Result.rows[0].id;
    logSuccess(`Created test member 2 (ID: ${testMember2Id})`);
    
    // Link members to chama
    await client.query(`
      INSERT INTO chama_members (chama_id, member_id, join_date, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW(), NOW())
    `, [testChamaId, testMember1Id]);
    
    await client.query(`
      INSERT INTO chama_members (chama_id, member_id, join_date, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW(), NOW())
    `, [testChamaId, testMember2Id]);
    
    logSuccess('Linked members to chama');
    
    await client.query('COMMIT');
    logSuccess('Test data setup complete');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Setup failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Test 1: Generate obligations for current month
async function testGenerateObligations() {
  logTest('TEST 1: Generate monthly obligations');
  
  const client = await pool.connect();
  
  try {
    // Get current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthStr = currentMonth.toISOString().split('T')[0];
    
    // Get active rule
    const ruleResult = await client.query(`
      SELECT * FROM contribution_rules
      WHERE chama_id = $1 AND effective_to IS NULL
      ORDER BY effective_from DESC
      LIMIT 1
    `, [testChamaId]);
    
    if (ruleResult.rows.length === 0) {
      throw new Error('No active contribution rule found');
    }
    
    const rule = ruleResult.rows[0];
    logInfo(`Using rule: ${rule.amount} ${rule.currency_code}`);
    
    // Get active members
    const membersResult = await client.query(`
      SELECT m.id, m.name
      FROM members m
      JOIN chama_members cm ON m.id = cm.member_id
      WHERE cm.chama_id = $1 AND cm.exit_date IS NULL
    `, [testChamaId]);
    
    logInfo(`Found ${membersResult.rows.length} active members`);
    
    // Insert obligations
    let insertedCount = 0;
    for (const member of membersResult.rows) {
      const result = await client.query(`
        INSERT INTO contribution_obligations (
          chama_id, member_id, contribution_month, expected_amount, 
          paid_amount, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (chama_id, member_id, contribution_month) DO NOTHING
        RETURNING id
      `, [testChamaId, member.id, monthStr, rule.amount, 0, 'pending']);
      
      if (result.rows.length > 0) {
        insertedCount++;
        if (!testObligationId) {
          testObligationId = result.rows[0].id;
        }
      }
    }
    
    logSuccess(`Generated ${insertedCount} obligations for ${monthStr}`);
    
    // Verify obligations exist
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count FROM contribution_obligations
      WHERE chama_id = $1 AND contribution_month = $2
    `, [testChamaId, monthStr]);
    
    const count = parseInt(verifyResult.rows[0].count);
    if (count === membersResult.rows.length) {
      logSuccess(`Verified: ${count} obligations created`);
    } else {
      throw new Error(`Expected ${membersResult.rows.length} obligations, found ${count}`);
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Test 2: Duplicate prevention (idempotency)
async function testDuplicatePrevention() {
  logTest('TEST 2: Duplicate prevention (idempotency)');
  
  const client = await pool.connect();
  
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthStr = currentMonth.toISOString().split('T')[0];
    
    // Count before
    const beforeResult = await client.query(`
      SELECT COUNT(*) as count FROM contribution_obligations
      WHERE chama_id = $1 AND contribution_month = $2
    `, [testChamaId, monthStr]);
    
    const countBefore = parseInt(beforeResult.rows[0].count);
    logInfo(`Obligations before: ${countBefore}`);
    
    // Try to insert duplicate
    const rule = await client.query(`
      SELECT amount FROM contribution_rules
      WHERE chama_id = $1 AND effective_to IS NULL
      LIMIT 1
    `, [testChamaId]);
    
    const insertResult = await client.query(`
      INSERT INTO contribution_obligations (
        chama_id, member_id, contribution_month, expected_amount, 
        paid_amount, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (chama_id, member_id, contribution_month) DO NOTHING
      RETURNING id
    `, [testChamaId, testMember1Id, monthStr, rule.rows[0].amount, 0, 'pending']);
    
    if (insertResult.rows.length === 0) {
      logSuccess('Duplicate insert correctly prevented by UNIQUE constraint');
    } else {
      throw new Error('Duplicate was not prevented!');
    }
    
    // Count after
    const afterResult = await client.query(`
      SELECT COUNT(*) as count FROM contribution_obligations
      WHERE chama_id = $1 AND contribution_month = $2
    `, [testChamaId, monthStr]);
    
    const countAfter = parseInt(afterResult.rows[0].count);
    
    if (countBefore === countAfter) {
      logSuccess(`Count unchanged: ${countAfter} (duplicates prevented)`);
    } else {
      throw new Error(`Count changed from ${countBefore} to ${countAfter}`);
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Test 3: Record payment and update status
async function testPaymentRecording() {
  logTest('TEST 3: Record payment and update obligation status');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get obligation
    const obligationResult = await client.query(`
      SELECT * FROM contribution_obligations WHERE id = $1
    `, [testObligationId]);
    
    if (obligationResult.rows.length === 0) {
      throw new Error('Test obligation not found');
    }
    
    const obligation = obligationResult.rows[0];
    logInfo(`Original: expected=${obligation.expected_amount}, paid=${obligation.paid_amount}, status=${obligation.status}`);
    
    // Record partial payment
    const partialAmount = 500;
    await client.query(`
      UPDATE contribution_obligations
      SET paid_amount = paid_amount + $1,
          status = CASE 
            WHEN paid_amount + $1 >= expected_amount THEN 'paid'
            WHEN paid_amount + $1 > 0 THEN 'partial'
            ELSE 'pending'
          END,
          updated_at = NOW()
      WHERE id = $2
    `, [partialAmount, testObligationId]);
    
    logSuccess(`Recorded partial payment: ${partialAmount}`);
    
    // Verify partial status
    const partialResult = await client.query(`
      SELECT * FROM contribution_obligations WHERE id = $1
    `, [testObligationId]);
    
    const partial = partialResult.rows[0];
    if (partial.status === 'partial' && parseFloat(partial.paid_amount) === partialAmount) {
      logSuccess(`Status updated to 'partial', paid_amount = ${partial.paid_amount}`);
    } else {
      throw new Error(`Expected status='partial', got '${partial.status}'`);
    }
    
    // Record remaining payment
    const remainingAmount = parseFloat(obligation.expected_amount) - partialAmount;
    await client.query(`
      UPDATE contribution_obligations
      SET paid_amount = paid_amount + $1,
          status = CASE 
            WHEN paid_amount + $1 >= expected_amount THEN 'paid'
            WHEN paid_amount + $1 > 0 THEN 'partial'
            ELSE 'pending'
          END,
          updated_at = NOW()
      WHERE id = $2
    `, [remainingAmount, testObligationId]);
    
    logSuccess(`Recorded remaining payment: ${remainingAmount}`);
    
    // Verify paid status
    const paidResult = await client.query(`
      SELECT * FROM contribution_obligations WHERE id = $1
    `, [testObligationId]);
    
    const paid = paidResult.rows[0];
    if (paid.status === 'paid' && parseFloat(paid.paid_amount) >= parseFloat(paid.expected_amount)) {
      logSuccess(`Status updated to 'paid', paid_amount = ${paid.paid_amount}`);
    } else {
      throw new Error(`Expected status='paid', got '${paid.status}'`);
    }
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Test failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Test 4: Mark overdue obligations
async function testOverdueMarking() {
  logTest('TEST 4: Mark overdue obligations');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create old unpaid obligation (last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];
    
    const oldObligationResult = await client.query(`
      INSERT INTO contribution_obligations (
        chama_id, member_id, contribution_month, expected_amount, 
        paid_amount, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (chama_id, member_id, contribution_month) DO UPDATE
      SET status = 'pending', paid_amount = 0
      RETURNING id
    `, [testChamaId, testMember2Id, lastMonthStr, 1100, 0, 'pending']);
    
    const oldObligationId = oldObligationResult.rows[0].id;
    logInfo(`Created old obligation for ${lastMonthStr} (ID: ${oldObligationId})`);
    
    // Mark old unpaid obligations as overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const updateResult = await client.query(`
      UPDATE contribution_obligations
      SET status = 'overdue', updated_at = NOW()
      WHERE contribution_month < $1
        AND status IN ('pending', 'partial')
        AND paid_amount < expected_amount
      RETURNING id
    `, [todayStr]);
    
    logSuccess(`Marked ${updateResult.rows.length} obligations as overdue`);
    
    // Verify overdue status
    const verifyResult = await client.query(`
      SELECT * FROM contribution_obligations WHERE id = $1
    `, [oldObligationId]);
    
    if (verifyResult.rows[0].status === 'overdue') {
      logSuccess(`Obligation ${oldObligationId} correctly marked as overdue`);
    } else {
      throw new Error(`Expected 'overdue', got '${verifyResult.rows[0].status}'`);
    }
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Test failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Test 5: Calculate arrears
async function testArrearsCalculation() {
  logTest('TEST 5: Calculate arrears (outstanding balances)');
  
  const client = await pool.connect();
  
  try {
    // Query arrears
    const arrearsResult = await client.query(`
      SELECT 
        m.id as member_id,
        m.name as member_name,
        m.phone,
        COUNT(*) as total_obligations,
        SUM(co.expected_amount) as total_expected,
        SUM(co.paid_amount) as total_paid,
        SUM(co.expected_amount - co.paid_amount) as total_outstanding,
        SUM(CASE WHEN co.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
      FROM contribution_obligations co
      JOIN members m ON co.member_id = m.id
      WHERE co.chama_id = $1
        AND co.status IN ('pending', 'partial', 'overdue')
        AND co.paid_amount < co.expected_amount
      GROUP BY m.id, m.name, m.phone
      ORDER BY total_outstanding DESC
    `, [testChamaId]);
    
    logInfo(`Found ${arrearsResult.rows.length} members with arrears`);
    
    for (const row of arrearsResult.rows) {
      logInfo(`  ${row.member_name}: ${row.total_outstanding} outstanding (${row.overdue_count} overdue)`);
    }
    
    // Calculate summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(DISTINCT member_id) as total_members_in_arrears,
        SUM(expected_amount - paid_amount) as total_outstanding,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as total_overdue
      FROM contribution_obligations
      WHERE chama_id = $1
        AND status IN ('pending', 'partial', 'overdue')
        AND paid_amount < expected_amount
    `, [testChamaId]);
    
    const summary = summaryResult.rows[0];
    logSuccess(`Summary: ${summary.total_members_in_arrears} members, ${summary.total_outstanding} outstanding, ${summary.total_overdue} overdue`);
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Test 6: Cross-chama isolation
async function testCrossChamaIsolation() {
  logTest('TEST 6: Cross-chama isolation (obligations don\'t mix)');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create second test chama
    const chama2Result = await client.query(`
      INSERT INTO chamas (name, description, registration_number, 
        contribution_frequency, contribution_amount, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `, ['Test Chama 2', 'Second test chama', 'TEST-OBL2-' + Date.now(), 'monthly', 2000]);
    
    const testChama2Id = chama2Result.rows[0].id;
    logInfo(`Created second test chama (ID: ${testChama2Id})`);
    
    // Create rule for chama 2
    await client.query(`
      INSERT INTO contribution_rules (chama_id, amount, currency_code, frequency, 
        effective_from, effective_to, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NULL, NOW(), NOW())
    `, [testChama2Id, 2000.00, 'KES', 'monthly', '2026-01-01']);
    
    // Link member 1 to both chamas
    await client.query(`
      INSERT INTO chama_members (chama_id, member_id, join_date, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW(), NOW())
    `, [testChama2Id, testMember1Id]);
    
    logInfo('Linked member 1 to both chamas');
    
    // Generate obligations for chama 2
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthStr = currentMonth.toISOString().split('T')[0];
    
    await client.query(`
      INSERT INTO contribution_obligations (
        chama_id, member_id, contribution_month, expected_amount, 
        paid_amount, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (chama_id, member_id, contribution_month) DO NOTHING
    `, [testChama2Id, testMember1Id, monthStr, 2000, 0, 'pending']);
    
    logSuccess('Created obligation for member 1 in chama 2');
    
    // Verify chama 1 obligations unchanged
    const chama1Result = await client.query(`
      SELECT COUNT(*) as count, SUM(expected_amount) as total
      FROM contribution_obligations
      WHERE chama_id = $1 AND member_id = $2 AND contribution_month = $3
    `, [testChamaId, testMember1Id, monthStr]);
    
    const chama1Count = parseInt(chama1Result.rows[0].count);
    const chama1Total = parseFloat(chama1Result.rows[0].total) || 0;
    
    if (chama1Count === 1 && chama1Total === 1100) {
      logSuccess(`Chama 1: ${chama1Count} obligation, total ${chama1Total} (unchanged)`);
    } else {
      throw new Error(`Chama 1 data changed unexpectedly`);
    }
    
    // Verify chama 2 obligations
    const chama2Verify = await client.query(`
      SELECT COUNT(*) as count, SUM(expected_amount) as total
      FROM contribution_obligations
      WHERE chama_id = $1 AND member_id = $2 AND contribution_month = $3
    `, [testChama2Id, testMember1Id, monthStr]);
    
    const chama2Count = parseInt(chama2Verify.rows[0].count);
    const chama2Total = parseFloat(chama2Verify.rows[0].total) || 0;
    
    if (chama2Count === 1 && chama2Total === 2000) {
      logSuccess(`Chama 2: ${chama2Count} obligation, total ${chama2Total} (correct)`);
    } else {
      throw new Error(`Chama 2 data incorrect`);
    }
    
    logSuccess('Chama isolation verified - obligations properly separated');
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Test failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Cleanup: Remove test data
async function cleanupTestData() {
  logTest('CLEANUP: Removing test data');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete obligations
    await client.query(`
      DELETE FROM contribution_obligations WHERE chama_id = $1
    `, [testChamaId]);
    
    // Delete contribution rules
    await client.query(`
      DELETE FROM contribution_rules WHERE chama_id = $1
    `, [testChamaId]);
    
    // Delete chama members
    await client.query(`
      DELETE FROM chama_members WHERE member_id IN ($1, $2)
    `, [testMember1Id, testMember2Id]);
    
    // Delete members
    await client.query(`
      DELETE FROM members WHERE id IN ($1, $2)
    `, [testMember1Id, testMember2Id]);
    
    // Delete chamas
    await client.query(`
      DELETE FROM chamas WHERE id = $1 OR name LIKE 'Test Chama 2'
    `, [testChamaId]);
    
    await client.query('COMMIT');
    logSuccess('Test data cleaned up');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Cleanup failed: ${error.message}`);
  } finally {
    client.release();
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  log('CONTRIBUTION OBLIGATIONS SYSTEM - TEST SUITE', BLUE);
  console.log('='.repeat(70));
  
  let passedTests = 0;
  let failedTests = 0;
  
  try {
    await setupTestData();
    
    const tests = [
      testGenerateObligations,
      testDuplicatePrevention,
      testPaymentRecording,
      testOverdueMarking,
      testArrearsCalculation,
      testCrossChamaIsolation
    ];
    
    for (const test of tests) {
      try {
        await test();
        passedTests++;
      } catch (error) {
        failedTests++;
        logError(`TEST FAILED: ${error.message}`);
      }
    }
    
  } catch (error) {
    logError(`SETUP FAILED: ${error.message}`);
    process.exit(1);
  } finally {
    await cleanupTestData();
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  log('TEST SUMMARY', BLUE);
  console.log('='.repeat(70));
  log(`Total Tests: ${passedTests + failedTests}`, YELLOW);
  log(`Passed: ${passedTests}`, GREEN);
  log(`Failed: ${failedTests}`, failedTests > 0 ? RED : GREEN);
  console.log('='.repeat(70) + '\n');
  
  await pool.end();
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  pool.end();
  process.exit(1);
});
