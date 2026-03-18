/**
 * Contributions Routes
 * CRUD endpoints for contributions
 */

import express from 'express';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.mjs';

const router = express.Router();

const ensureNumericIdParam = (req, _res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return next('route');
  }
  next();
};

// GET /api/contributions - list all contributions
router.get('/', async (req, res) => {
  const client = await req.app.locals.pool.connect();

  try {
    const result = await client.query(
      `SELECT id, chama_id, member_id, amount, contribution_type, contribution_date,
              payment_method, reference_number, receipt_number, status, notes,
              recorded_by, created_at, updated_at
       FROM contributions
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({
      error: 'Failed to fetch contributions',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// GET /api/contributions/:id - get contribution by id
router.get('/:id', ensureNumericIdParam, [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const result = await client.query(
      `SELECT id, chama_id, member_id, amount, contribution_type, contribution_date,
              payment_method, reference_number, receipt_number, status, notes,
              recorded_by, created_at, updated_at
       FROM contributions
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contribution:', error);
    res.status(500).json({
      error: 'Failed to fetch contribution',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// POST /api/contributions - create contribution
router.post(
  '/',
  [
    body('chamaId').isInt(),
    body('memberId').isInt(),
    body('amount').isFloat({ gt: 0 }),
    body('contributionType').optional().isString(),
    body('status').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const {
      chamaId,
      memberId,
      amount,
      contributionType,
      contributionDate,
      paymentMethod,
      referenceNumber,
      receiptNumber,
      status,
      notes,
      recordedBy,
    } = req.body;

    const result = await client.query(
      `INSERT INTO contributions (
         chama_id, member_id, amount, contribution_type, contribution_date,
         payment_method, reference_number, receipt_number, status, notes, recorded_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        chamaId,
        memberId,
        amount,
        contributionType || 'regular',
        contributionDate || null,
        paymentMethod || null,
        referenceNumber || null,
        receiptNumber || null,
        status || 'completed',
        notes || null,
        recordedBy || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contribution:', error);
    res.status(500).json({
      error: 'Failed to create contribution',
      message: error.message,
    });
  } finally {
    client.release();
  }
  }
);

// PUT /api/contributions/:id - update contribution
router.put(
  '/:id',
  ensureNumericIdParam,
  [
    param('id').isInt(),
    body('chamaId').isInt(),
    body('memberId').isInt(),
    body('amount').isFloat({ gt: 0 }),
    body('contributionType').optional().isString(),
    body('status').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const {
      chamaId,
      memberId,
      amount,
      contributionType,
      contributionDate,
      paymentMethod,
      referenceNumber,
      receiptNumber,
      status,
      notes,
      recordedBy,
    } = req.body;

    const result = await client.query(
      `UPDATE contributions
       SET chama_id = $1,
           member_id = $2,
           amount = $3,
           contribution_type = $4,
           contribution_date = $5,
           payment_method = $6,
           reference_number = $7,
           receipt_number = $8,
           status = $9,
           notes = $10,
           recorded_by = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        chamaId,
        memberId,
        amount,
        contributionType || 'regular',
        contributionDate || null,
        paymentMethod || null,
        referenceNumber || null,
        receiptNumber || null,
        status || 'completed',
        notes || null,
        recordedBy || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contribution:', error);
    res.status(500).json({
      error: 'Failed to update contribution',
      message: error.message,
    });
  } finally {
    client.release();
  }
  }
);

// DELETE /api/contributions/:id - delete contribution
router.delete('/:id', ensureNumericIdParam, [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const result = await client.query(
      'DELETE FROM contributions WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    res.json({ message: 'Contribution deleted successfully' });
  } catch (error) {
    console.error('Error deleting contribution:', error);
    res.status(500).json({
      error: 'Failed to delete contribution',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// ============================================================
// CONTRIBUTION OBLIGATIONS ENDPOINTS
// ============================================================

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
router.get('/obligations', async (req, res) => {
  const client = await req.app.locals.pool.connect();
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
        m.name as member_name,
        co.contribution_month,
        co.expected_amount,
        co.paid_amount,
        (co.expected_amount - COALESCE(co.paid_amount, 0)) as outstanding_balance,
        co.status,
        co.created_at,
        co.updated_at
      FROM contribution_obligations co
      JOIN chamas c ON c.id = co.chama_id
      JOIN members m ON m.id = co.member_id
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
      obligations: result.rows,
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
});

/**
 * GET /api/contributions/arrears
 * Get members with outstanding balances (arrears)
 * 
 * Query parameters:
 * - chama_id: Filter by chama (required)
 * - month: Filter by specific month (optional)
 */
router.get('/arrears', async (req, res) => {
  const client = await req.app.locals.pool.connect();
  try {
    const { chama_id, month } = req.query;

    if (!chama_id) {
      return res.status(400).json({ error: 'ValidationError', message: 'chama_id is required' });
    }

    const query = `
      SELECT 
        m.id as member_id,
        m.name as member_name,
        m.phone as phone_number,
        cm.id as chama_member_id,
        COUNT(co.id) as total_obligations,
        COUNT(CASE WHEN co.status = 'overdue' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN co.status = 'partial' THEN 1 END) as partial_count,
        COALESCE(SUM(co.expected_amount), 0) as total_expected,
        COALESCE(SUM(co.paid_amount), 0) as total_paid,
        COALESCE(SUM(co.expected_amount - COALESCE(co.paid_amount, 0)), 0) as total_outstanding
      FROM members m
      JOIN chama_members cm ON cm.member_id = m.id
      LEFT JOIN contribution_obligations co ON co.member_id = cm.member_id AND co.chama_id = cm.chama_id
      WHERE cm.chama_id = $1
        AND cm.is_active = true
        AND cm.exit_date IS NULL
        ${month ? "AND DATE_TRUNC('month', co.contribution_month) = DATE_TRUNC('month', $2::date)" : ''}
      GROUP BY m.id, m.name, m.phone, cm.id
      HAVING COALESCE(SUM(co.expected_amount - COALESCE(co.paid_amount, 0)), 0) > 0
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
});

/**
 * GET /api/contributions/obligations/stats
 * Get summary statistics for obligations
 * 
 * Query parameters:
 * - chama_id: Filter by chama (optional)
 * - month: Filter by month (optional)
 */
router.get('/obligations/stats', async (req, res) => {
  const client = await req.app.locals.pool.connect();
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
        COALESCE(SUM(expected_amount), 0) as total_expected,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(expected_amount - COALESCE(paid_amount, 0)), 0) as total_outstanding,
        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN (expected_amount - COALESCE(paid_amount, 0)) <= 0 THEN 100
                ELSE (COALESCE(paid_amount, 0) / NULLIF(expected_amount, 0) * 100)
              END
            ),
            0
          ),
          2
        ) as average_payment_rate
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
});

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
    param('id').isInt(),
    body('amount').isDecimal({ decimal_digits: '0,2' }),
    body('payment_method').isIn(['cash', 'mpesa', 'bank_transfer']),
    body('reference_number').optional().trim(),
    body('notes').optional().trim(),
    body('payment_date').optional().isISO8601(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const client = await req.app.locals.pool.connect();
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

      const currentOutstanding = Math.max(
        0,
        parseFloat(obligation.expected_amount) - parseFloat(obligation.paid_amount || 0)
      );
      if (paymentAmount > currentOutstanding) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'ValidationError',
          message: `Payment amount (${paymentAmount}) exceeds outstanding balance (${currentOutstanding})`,
        });
      }

      // Calculate new values
      const newPaidAmount = Math.min(
        parseFloat(obligation.expected_amount),
        parseFloat(obligation.paid_amount || 0) + paymentAmount
      );
      const newOutstandingBalance = Math.max(0, parseFloat(obligation.expected_amount) - newPaidAmount);
      const newStatus = newOutstandingBalance <= 0 ? 'paid' : 'partial';

      // Update obligation
      await client.query(
        `UPDATE contribution_obligations 
         SET paid_amount = $1,
             status = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newPaidAmount, newStatus, id]
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
          1, // Default user (would use req.user?.id with auth middleware)
          notes || `Payment for ${obligation.contribution_month.toISOString().substring(0, 7)} obligation`,
        ]
      );

      // Update chama_members total_contributions
      await client.query(
        `UPDATE chama_members 
         SET total_contributions = total_contributions + $1,
             updated_at = NOW()
         WHERE chama_id = $2 AND member_id = $3`,
        [paymentAmount, obligation.chama_id, obligation.member_id]
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
 * POST /api/contributions/run-monthly-job
 * Manually trigger the monthly obligations generation job
 * (Admin only - add authentication middleware in production)
 */
router.post('/run-monthly-job', async (req, res) => {
  try {
    // Import and run the monthly job
    const { spawn } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const jobPath = join(__dirname, '../jobs/generateMonthlyObligations.mjs');
    
    const job = spawn('node', [jobPath], {
      stdio: 'pipe',
      cwd: join(__dirname, '..'),
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
