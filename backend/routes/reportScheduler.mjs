import express from 'express';
import { body, validationResult } from 'express-validator';
import pg from 'pg';

const { Pool } = pg;
const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chamaPlus',
  user: process.env.DB_USER || 'chama_app',
  password: process.env.DB_PASSWORD
});

/**
 * GET /api/report-schedules
 * Get all scheduled reports for a chama
 */
router.get('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { chama_id } = req.query;
    
    if (!chama_id) {
      return res.status(400).json({ error: 'chama_id is required' });
    }

    const result = await client.query(`
      SELECT 
        id,
        chama_id,
        report_type,
        frequency,
        day_of_month,
        day_of_week,
        recipient_emails,
        format,
        is_active,
        last_run_at,
        next_run_at,
        created_at,
        updated_at
      FROM report_schedules
      WHERE chama_id = $1
      ORDER BY created_at DESC
    `, [chama_id]);

    res.json({ schedules: result.rows });
  } catch (error) {
    console.error('Error fetching report schedules:', error);
    res.status(500).json({ error: 'Failed to fetch report schedules' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/report-schedules
 * Create a new scheduled report
 */
router.post(
  '/',
  [
    body('chama_id').isInt(),
    body('report_type').isIn([
      'financial_statement',
      'loan_portfolio',
      'contributions',
      'asset_register',
      'net_worth',
      'welfare_fund',
      'fines_report',
      'transactions'
    ]),
    body('frequency').isIn(['daily', 'weekly', 'monthly']),
    body('recipient_emails').isArray(),
    body('format').isIn(['pdf', 'excel']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    
    try {
      const {
        chama_id,
        report_type,
        frequency,
        day_of_month,
        day_of_week,
        recipient_emails,
        format,
      } = req.body;

      // Calculate next run time
      const next_run_at = calculateNextRun(frequency, day_of_month, day_of_week);

      const result = await client.query(`
        INSERT INTO report_schedules (
          chama_id,
          report_type,
          frequency,
          day_of_month,
          day_of_week,
          recipient_emails,
          format,
          next_run_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        chama_id,
        report_type,
        frequency,
        day_of_month || null,
        day_of_week || null,
        JSON.stringify(recipient_emails),
        format,
        next_run_at
      ]);

      res.status(201).json({
        message: 'Report schedule created successfully',
        schedule: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating report schedule:', error);
      res.status(500).json({ error: 'Failed to create report schedule' });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/report-schedules/:id
 * Update a scheduled report
 */
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      frequency,
      day_of_month,
      day_of_week,
      recipient_emails,
      format,
      is_active
    } = req.body;

    // Calculate new next run time if frequency changed
    const next_run_at = frequency 
      ? calculateNextRun(frequency, day_of_month, day_of_week)
      : undefined;

    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (frequency) {
      updates.push(`frequency = $${valueIndex++}`);
      values.push(frequency);
    }
    if (day_of_month !== undefined) {
      updates.push(`day_of_month = $${valueIndex++}`);
      values.push(day_of_month);
    }
    if (day_of_week !== undefined) {
      updates.push(`day_of_week = $${valueIndex++}`);
      values.push(day_of_week);
    }
    if (recipient_emails) {
      updates.push(`recipient_emails = $${valueIndex++}`);
      values.push(JSON.stringify(recipient_emails));
    }
    if (format) {
      updates.push(`format = $${valueIndex++}`);
      values.push(format);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${valueIndex++}`);
      values.push(is_active);
    }
    if (next_run_at) {
      updates.push(`next_run_at = $${valueIndex++}`);
      values.push(next_run_at);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await client.query(`
      UPDATE report_schedules
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({
      message: 'Report schedule updated successfully',
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating report schedule:', error);
    res.status(500).json({ error: 'Failed to update report schedule' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/report-schedules/:id
 * Delete a scheduled report
 */
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM report_schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ message: 'Report schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting report schedule:', error);
    res.status(500).json({ error: 'Failed to delete report schedule' });
  } finally {
    client.release();
  }
});

/**
 * Helper: Calculate next run time based on frequency
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

export default router;
