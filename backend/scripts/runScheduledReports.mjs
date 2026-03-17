#!/usr/bin/env node

/**
 * Scheduled Reports Generator
 * Runs scheduled reports and sends them via email
 * Can be run manually or via cron
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { sendScheduledReportNotification } from '../utils/emailService.mjs';
import reportGenerator from '../utils/reportGenerator.mjs';
import excelGenerator from '../utils/excelGenerator.mjs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chamaPlus',
  user: process.env.DB_USER || 'chama_app',
  password: process.env.DB_PASSWORD
});

/**
 * Format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

/**
 * Format date
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Generate a report based on type
 */
async function generateReport(client, schedule) {
  const { id, chama_id, report_type, format } = schedule;
  
  // Get chama details
  const chamaResult = await client.query(
    'SELECT name FROM chamas WHERE id = $1',
    [chama_id]
  );

  if (chamaResult.rows.length === 0) {
    throw new Error(`Chama ${chama_id} not found`);
  }

  const chamaName = chamaResult.rows[0].name;
  
  // Generate report based on type
  // For simplicity, we'll just generate a simple summary report
  // In production, you'd call the actual report generation functions
  
  let reportBuffer;
  let filename;
  let contentType;

  if (format === 'pdf') {
    const doc = reportGenerator.createDocument();
    reportGenerator.addHeader(
      doc,
      chamaName,
      `${report_type.replace('_', ' ').toUpperCase()} - Scheduled Report`,
      formatDate(new Date())
    );

    reportGenerator.addSummarySection(doc, 'Report Information', [
      { label: 'Report Type', value: report_type },
      { label: 'Generated On', value: formatDate(new Date()) },
      { label: 'Frequency', value: schedule.frequency }
    ], 160);

    reportGenerator.addFooter(doc);
    reportBuffer = await reportGenerator.toBuffer(doc);
    filename = `${report_type}-${Date.now()}.pdf`;
    contentType = 'application/pdf';
  } else {
    const workbook = excelGenerator.createWorkbook();
    excelGenerator.addSummarySheet(
      workbook,
      chamaName,
      `${report_type} - Scheduled Report`,
      [
        { label: 'Report Type', value: report_type },
        { label: 'Generated On', value: formatDate(new Date()) },
        { label: 'Frequency', value: schedule.frequency }
      ]
    );
    reportBuffer = await excelGenerator.toBuffer(workbook);
    filename = `${report_type}-${Date.now()}.xlsx`;
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  return { reportBuffer, filename, contentType };
}

/**
 * Process a single scheduled report
 */
async function processSchedule(client, schedule) {
  const { id, recipient_emails, report_type, format } = schedule;
  
  console.log(`Processing schedule ${id}: ${report_type} (${format})`);
  
  try {
    // Generate the report
    const { reportBuffer, filename, contentType } = await generateReport(client, schedule);

    // Send to all recipients
    const recipients = JSON.parse(recipient_emails);
    const reports = [{
      name: report_type.replace('_', ' ').toUpperCase(),
      format,
      filename,
      buffer: reportBuffer,
      contentType
    }];

    for (const recipient of recipients) {
      try {
        await sendScheduledReportNotification({
          to: recipient,
          reports
        });
        console.log(`  ✓ Sent to ${recipient}`);
      } catch (error) {
        console.error(`  ✗ Failed to send to ${recipient}:`, error.message);
      }
    }

    // Update last_run_at and calculate next_run_at
    const next_run_at = calculateNextRun(
      schedule.frequency,
      schedule.day_of_month,
      schedule.day_of_week
    );

    await client.query(
      'UPDATE report_schedules SET last_run_at = NOW(), next_run_at = $1 WHERE id = $2',
      [next_run_at, id]
    );

    // Log to history
    await client.query(
      `INSERT INTO report_schedule_history 
       (schedule_id, chama_id, report_type, recipient_emails, format, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, schedule.chama_id, report_type, recipient_emails, format, 'success']
    );

    console.log(`  ✓ Schedule ${id} completed successfully`);
    return { success: true };

  } catch (error) {
    console.error(`  ✗ Schedule ${id} failed:`, error);
    
    // Log error to history
    await client.query(
      `INSERT INTO report_schedule_history 
       (schedule_id, chama_id, report_type, recipient_emails, format, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, schedule.chama_id, report_type, recipient_emails, format, 'failed', error.message]
    );

    return { success: false, error: error.message };
  }
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency, dayOfMonth, dayOfWeek) {
  const now = new Date();
  let nextRun = new Date(now);

  switch (frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
      break;
      
    case 'weekly':
      const targetDay = dayOfWeek || 1; // Default to Monday
      const currentDay = now.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      nextRun.setDate(now.getDate() + daysUntilTarget);
      nextRun.setHours(0, 0, 0, 0);
      break;
      
    case 'monthly':
      const targetDayOfMonth = dayOfMonth || 1; // Default to 1st
      nextRun.setMonth(now.getMonth() + 1);
      nextRun.setDate(targetDayOfMonth);
      nextRun.setHours(0, 0, 0, 0);
      break;
      
    default:
      throw new Error('Invalid frequency');
  }

  return nextRun;
}

/**
 * Main function - process all due schedules
 */
async function runScheduledReports() {
  console.log('='.repeat(60));
  console.log('Scheduled Reports Generator');
  console.log('Started at:', new Date().toISOString());
  console.log('='.repeat(60));

  const client = await pool.connect();
  
  try {
    // Get all due schedules
    const result = await client.query(`
      SELECT * FROM report_schedules
      WHERE is_active = true
        AND next_run_at <= NOW()
      ORDER BY next_run_at ASC
    `);

    const schedules = result.rows;
    console.log(`Found ${schedules.length} schedule(s) to process\n`);

    if (schedules.length === 0) {
      console.log('No schedules due. Exiting.');
      return;
    }

    // Process each schedule
    const results = [];
    for (const schedule of schedules) {
      const result = await processSchedule(client, schedule);
      results.push({ schedule_id: schedule.id, ...result });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Total: ${results.length}`);
    console.log(`  Success: ${results.filter(r => r.success).length}`);
    console.log(`  Failed: ${results.filter(r => !r.success).length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScheduledReports()
    .then(() => {
      console.log('\n✓ Scheduled reports processing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Scheduled Reports processing failed:', error);
      process.exit(1);
    });
}

export default runScheduledReports;
