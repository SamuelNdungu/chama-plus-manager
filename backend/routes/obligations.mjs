import { Router } from 'express';
import pkg from 'pg';
import { body, query, param, validationResult } from 'express-validator';

const { Pool } = pkg;
const router = Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chamaPlus',
  user: process.env.DB_USER || 'chama_app',
  password: process.env.DB_PASSWORD,
});

/**
 * GET /api/contributions/obligations
 * List contribution obligations with filters
 * 
 * Query parameters:
 * - chama_id: Filter by chama
 * - member_id: Filter by member
 * - status: Filter by status (pending, partial, paid, overdue, waived)
 * - month: Filter by contribution month (YYYY-MM-DD format)
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 */
router.get(
  '/obligations',
  [
    query('chama_id').optional().isInt().withMessage('Invalid chama_id'),
    query('member_id').optional().isInt().withMessage('Invalid member_id'),
    query('status').optional().isIn(['pending', 'partial', 'paid', 'overdue', 'waived']),
    query('month').optional().isISO8601().withMessage('Invalid date format'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be 1-200'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Invalid offset'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const {
        chama_id,
        member_id,
        status,
        month,
        limit = 50,
        offset = 0,
      } = req.query;

      // Build query dynamically
      let query = `
        SELECT 
          co.id,
          co.chama_id,
          c.name as chama_name,
          co.member_id,
          m.first_name || ' ' || m.last_name as member_name,
          co.contribution_month,
          co.expected_amount,
          co.paid_amount,
          co.outstanding_balance,
          co.status,
          co.created_at,
          co.updated_at
        FROM contribution_obligations co
        JOIN chamas c ON c.id = co.chama_id
        JOIN chama_members cm ON cm.id = co.member_id
        JOIN members m ON m.id = cm.member_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (chama_id) {
        query += ` AND co.chama_id = $${paramCount}`;
        params.push(chama_id);
        paramCount++;
      }

      if (member_id) {
        query += ` AND co.member_id = $${paramCount}`;
        params.push(member_id);
        paramCount++;
      }

      if (status) {
        query += ` AND co.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (month) {
        query += ` AND DATE_TRUNC('month', co.contribution_month) = DATE_TRUNC('month', $${paramCount}::date)`;
        params.push(month);
        paramCount++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Add sorting and pagination
      query += ` ORDER BY co.contribution_month DESC, c.name, member_name`;
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      res.json({
        data: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching obligations:', error);
      res.status(500).json({ error: 'DatabaseError', message: 'Failed to fetch obligations' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/contributions/arrears
 * Get members with outstanding balances (arrears)
 * 
 * Query parameters:
 * - chama_id: Filter by chama (required)
 * - month: Filter by specific month (optional, defaults to current month)
 */
router.get(
  '/arrears',
  [
    query('chama_id').isInt().withMessage('chama_id is required'),
    query('month').optional().isISO8601().withMessage('Invalid date format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, month } = req.query;

      const query = `
        SELECT 
          m.id as member_id,
          m.first_name || ' ' || m.last_name as member_name,
          m.phone_number,
          cm.id as chama_member_id,
          COUNT(co.id) as total_obligations,
          COUNT(CASE WHEN co.status = 'overdue' THEN 1 END) as overdue_count,
          COUNT(CASE WHEN co.status = 'partial' THEN 1 END) as partial_count,
          SUM(co.expected_amount) as total_expected,
          SUM(co.paid_amount) as total_paid,
          SUM(co.outstanding_balance) as total_outstanding
        FROM members m
        JOIN chama_members cm ON cm.member_id = m.id
        LEFT JOIN contribution_obligations co ON co.member_id = cm.id AND co.chama_id = $1
        WHERE cm.chama_id = $1
          AND cm.is_active = true
          AND cm.exit_date IS NULL
          ${month ? "AND DATE_TRUNC('month', co.contribution_month) = DATE_TRUNC('month', $2::date)" : ''}
        GROUP BY m.id, m.first_name, m.last_name, m.phone_number, cm.id
        HAVING SUM(co.outstanding_balance) > 0
        ORDER BY total_outstanding DESC
      `;

      const params = month ? [chama_id, month] : [chama_id];
      const result = await client.query(query, params);

      // Calculate summary statistics
      const summary = result.rows.reduce(
        (acc, row) => ({
          total_members_in_arrears: acc.total_members_in_arrears + 1,
          total_outstanding: acc.total_outstanding + parseFloat(row.total_outstanding || 0),
          total_overdue: acc.total_overdue + parseInt(row.overdue_count || 0),
        }),
        { total_members_in_arrears: 0, total_outstanding: 0, total_overdue: 0 }
      );

      res.json({
        data: result.rows,
        summary,
      });
    } catch (error) {
      console.error('Error fetching arrears:', error);
      res.status(500).json({ error: 'DatabaseError', message: 'Failed to fetch arrears data' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/contributions/obligations/:id/pay
 * Record a payment against an obligation
 * 
 * Body:
 * - amount: Payment amount (required)
 * - payment_method: cash, mpesa, bank_transfer (required)
 * - reference_number: Transaction reference (optional)
 * - notes: Payment notes (optional)
 * - payment_date: Date of payment (optional, defaults to now)
 */
router.post(
  '/obligations/:id/pay',
  [
    param('id').isInt().withMessage('Invalid obligation ID'),
    body('amount').isDecimal({ decimal_digits: '0,2' }).withMessage('Invalid amount'),
    body('payment_method').isIn(['cash', 'mpesa', 'bank_transfer']).withMessage('Invalid payment method'),
    body('reference_number').optional().trim(),
    body('notes').optional().trim(),
    body('payment_date').optional().isISO8601().withMessage('Invalid date format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { amount, payment_method, reference_number, notes, payment_date } = req.body;

      await client.query('BEGIN');

      // Get current obligation
      const obligationResult = await client.query(
        'SELECT * FROM contribution_obligations WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (obligationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'NotFound', message: 'Obligation not found' });
      }

      const obligation = obligationResult.rows[0];

      // Validate amount
      const paymentAmount = parseFloat(amount);
      if (paymentAmount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'ValidationError', 
          message: 'Payment amount must be greater than zero' 
        });
      }

      const currentOutstanding = parseFloat(obligation.outstanding_balance);
      if (paymentAmount > currentOutstanding) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'ValidationError',
          message: `Payment amount (${paymentAmount}) exceeds outstanding balance (${currentOutstanding})`,
        });
      }

      // Calculate new values
      const newPaidAmount = parseFloat(obligation.paid_amount) + paymentAmount;
      const newOutstandingBalance = parseFloat(obligation.expected_amount) - newPaidAmount;
      const newStatus = newOutstandingBalance <= 0 ? 'paid' : 'partial';

      // Update obligation
      await client.query(
        `UPDATE contribution_obligations 
         SET paid_amount = $1,
             outstanding_balance = $2,
             status = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [newPaidAmount, newOutstandingBalance, newStatus, id]
      );

      // Record contribution
      const contributionResult = await client.query(
        `INSERT INTO contributions (
          chama_id,
          member_id,
          amount,
          contribution_type,
          payment_method,
          reference_number,
          contribution_date,
          recorded_by,
          notes,
          status
        ) VALUES ($1, $2, $3, 'regular', $4, $5, $6, $7, $8, 'completed')
        RETURNING *`,
        [
          obligation.chama_id,
          obligation.member_id,
          paymentAmount,
          payment_method,
          reference_number || `OBL-${id}-${Date.now()}`,
          payment_date || new Date(),
          req.user?.id || 1, // Assumes authentication middleware sets req.user
          notes || `Payment for ${obligation.contribution_month.toISOString().substring(0, 7)} obligation`,
        ]
      );

      // Update chama_members total_contributions
      await client.query(
        `UPDATE chama_members 
         SET total_contributions = total_contributions + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [paymentAmount, obligation.member_id]
      );

      // Update chama total_funds
      await client.query(
        `UPDATE chamas 
         SET total_funds = total_funds + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [paymentAmount, obligation.chama_id]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Payment recorded successfully',
        obligation: {
          id: parseInt(id),
          paid_amount: newPaidAmount,
          outstanding_balance: newOutstandingBalance,
          status: newStatus,
        },
        contribution: contributionResult.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording payment:', error);
      res.status(500).json({ error: 'DatabaseError', message: 'Failed to record payment' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/contributions/obligations/stats
 * Get summary statistics for obligations
 * 
 * Query parameters:
 * - chama_id: Filter by chama (optional)
 * - month: Filter by month (optional)
 */
router.get(
  '/obligations/stats',
  [
    query('chama_id').optional().isInt().withMessage('Invalid chama_id'),
    query('month').optional().isISO8601().withMessage('Invalid date format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, month } = req.query;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (chama_id) {
        whereClause += ` AND co.chama_id = $${paramCount}`;
        params.push(chama_id);
        paramCount++;
      }

      if (month) {
        whereClause += ` AND DATE_TRUNC('month', co.contribution_month) = DATE_TRUNC('month', $${paramCount}::date)`;
        params.push(month);
        paramCount++;
      }

      const query = `
        SELECT 
          COUNT(*) as total_obligations,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
          COUNT(CASE WHEN status = 'waived' THEN 1 END) as waived_count,
          SUM(expected_amount) as total_expected,
          SUM(paid_amount) as total_paid,
          SUM(outstanding_balance) as total_outstanding,
          ROUND(AVG(CASE WHEN outstanding_balance = 0 THEN 100 ELSE (paid_amount / expected_amount * 100) END), 2) as average_payment_rate
        FROM contribution_obligations co
        ${whereClause}
      `;

      const result = await client.query(query, params);
      
      res.json({
        stats: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'DatabaseError', message: 'Failed to fetch statistics' });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/contributions/run-monthly-job
 * Manually trigger the monthly obligations generation job
 * (Admin only - should add authentication middleware)
 */
router.post('/run-monthly-job', async (req, res) => {
  const client = await pool.connect();
  try {
    // Import and run the monthly job
    const { spawn } = await import('child_process');
    const jobPath = new URL('../jobs/generateMonthlyObligations.mjs', import.meta.url).pathname;
    
    const job = spawn('node', [jobPath], {
      stdio: 'pipe',
      cwd: new URL('..', import.meta.url).pathname,
    });

    let output = '';
    let errorOutput = '';

    job.stdout.on('data', (data) => {
      output += data.toString();
    });

    job.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    job.on('close', (code) => {
      if (code === 0) {
        res.json({
          message: 'Monthly job executed successfully',
          output: output,
        });
      } else {
        res.status(500).json({
          error: 'JobExecutionError',
          message: 'Monthly job failed',
          output: output,
          errorOutput: errorOutput,
        });
      }
    });

  } catch (error) {
    console.error('Error running monthly job:', error);
    res.status(500).json({ error: 'ExecutionError', message: 'Failed to start monthly job' });
  }
});

export default router;
