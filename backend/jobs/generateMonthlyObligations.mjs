/**
 * Generate Monthly Contribution Obligations
 * 
 * This job runs on the 1st of every month to:
 * 1. Generate contribution obligations for all active members
 * 2. Mark previous unpaid obligations as overdue
 * 
 * Usage: node generateMonthlyObligations.mjs
 */

import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'chama_app',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'chamaPlus',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

/**
 * Get the first day of the current month
 */
function getCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
}

/**
 * Mark previous unpaid obligations as overdue
 */
async function markOverdueObligations(client) {
  const currentMonth = getCurrentMonth();
  
  const result = await client.query(`
    UPDATE contribution_obligations
    SET status = 'overdue',
        updated_at = CURRENT_TIMESTAMP
    WHERE contribution_month < $1
      AND status IN ('pending', 'partial')
      AND status != 'paid'
    RETURNING id
  `, [currentMonth]);

  return result.rowCount;
}

/**
 * Generate obligations for all active members in all chamas
 */
async function generateObligations(client) {
  const currentMonth = getCurrentMonth();
  
  // Get all active chamas with their current contribution rules
  const chamasResult = await client.query(`
    SELECT 
      c.id as chama_id,
      c.name as chama_name,
      cr.amount,
      cr.currency_code
    FROM chamas c
    INNER JOIN contribution_rules cr ON cr.chama_id = c.id
    WHERE c.is_active = true
      AND cr.effective_to IS NULL  -- Get current active rule
    ORDER BY c.id
  `);

  if (chamasResult.rows.length === 0) {
    console.log('⚠️  No active chamas with contribution rules found');
    return { chamasProcessed: 0, obligationsCreated: 0 };
  }

  let totalObligationsCreated = 0;
  const chamasProcessed = [];

  for (const chama of chamasResult.rows) {
    // Get all active members of this chama
    const membersResult = await client.query(`
      SELECT 
        cm.member_id,
        m.name as member_name
      FROM chama_members cm
      INNER JOIN members m ON m.id = cm.member_id
      WHERE cm.chama_id = $1
        AND cm.is_active = true
        AND (cm.exit_date IS NULL OR cm.exit_date > CURRENT_DATE)
        AND m.is_active = true
      ORDER BY cm.member_id
    `, [chama.chama_id]);

    if (membersResult.rows.length === 0) {
      console.log(`⚠️  Chama "${chama.chama_name}" has no active members`);
      continue;
    }

    // Insert obligations for each member
    let chamaObligations = 0;
    for (const member of membersResult.rows) {
      try {
        await client.query(`
          INSERT INTO contribution_obligations (
            chama_id,
            member_id,
            contribution_month,
            expected_amount,
            paid_amount,
            status
          )
          VALUES ($1, $2, $3, $4, 0, 'pending')
          ON CONFLICT (chama_id, member_id, contribution_month) DO NOTHING
        `, [
          chama.chama_id,
          member.member_id,
          currentMonth,
          chama.amount
        ]);

        chamaObligations++;
      } catch (error) {
        console.error(`❌ Failed to create obligation for member ${member.member_name}:`, error.message);
      }
    }

    totalObligationsCreated += chamaObligations;
    chamasProcessed.push({
      name: chama.chama_name,
      members: membersResult.rows.length,
      obligations: chamaObligations,
      amount: chama.amount
    });
  }

  return {
    chamasProcessed: chamasProcessed.length,
    obligationsCreated: totalObligationsCreated,
    details: chamasProcessed
  };
}

/**
 * Update system_jobs table with job status
 */
async function updateJobStatus(client, status, message) {
  await client.query(`
    INSERT INTO system_jobs (job_name, last_run, last_status, last_message, run_count)
    VALUES ('generate_monthly_obligations', CURRENT_TIMESTAMP, $1, $2, 1)
    ON CONFLICT (job_name) 
    DO UPDATE SET
      last_run = CURRENT_TIMESTAMP,
      last_status = $1,
      last_message = $2,
      run_count = system_jobs.run_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `, [status, message]);
}

/**
 * Main execution function
 */
async function main() {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    console.log('=========================================');
    console.log('Monthly Contribution Obligations Generator');
    console.log('=========================================');
    console.log(`📅 Run Date: ${new Date().toISOString()}`);
    console.log(`📅 Target Month: ${getCurrentMonth()}\n`);

    // Start transaction
    await client.query('BEGIN');

    // Step 1: Mark overdue obligations
    console.log('Step 1: Marking overdue obligations...');
    const overdueCount = await markOverdueObligations(client);
    console.log(`✅ Marked ${overdueCount} obligations as overdue\n`);

    // Step 2: Generate new obligations
    console.log('Step 2: Generating monthly obligations...');
    const result = await generateObligations(client);
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Chamas processed: ${result.chamasProcessed}`);
    console.log(`   - Obligations created: ${result.obligationsCreated}`);
    console.log(`   - Overdue marked: ${overdueCount}`);

    if (result.details && result.details.length > 0) {
      console.log(`\n📋 Details by Chama:`);
      result.details.forEach(chama => {
        console.log(`   ${chama.name}:`);
        console.log(`     - Members: ${chama.members}`);
        console.log(`     - Obligations: ${chama.obligations}`);
        console.log(`     - Amount: ${chama.amount} KES`);
      });
    }

    // Step 3: Update job status
    const message = `Generated ${result.obligationsCreated} obligations for ${result.chamasProcessed} chamas. Marked ${overdueCount} as overdue.`;
    await updateJobStatus(client, 'success', message);

    // Commit transaction
    await client.query('COMMIT');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Job completed successfully in ${duration}s`);
    console.log('=========================================\n');

    process.exit(0);

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');

    console.error('\n❌ Job failed:', error.message);
    console.error('Stack trace:', error.stack);

    // Update job status with error
    try {
      await updateJobStatus(client, 'failed', error.message);
    } catch (statusError) {
      console.error('Failed to update job status:', statusError.message);
    }

    console.log('=========================================\n');
    process.exit(1);

  } finally {
    client.release();
    await pool.end();
  }
}

// Run the job
main();
