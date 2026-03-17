/**
 * Financial Accounts Routes
 * Manage bank accounts, investment funds, and account movements
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.mjs';

const router = express.Router();

/**
 * GET /api/accounts
 * List all financial accounts for a chama
 */
router.get(
  '/',
  authenticateToken,
  [query('chama_id').optional().isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await req.app.locals.pool.connect();
    
    try {
      const chamaId = req.query.chama_id;
      
      let query = `
        SELECT 
          id, chama_id, name, type, currency_code, 
          current_balance, description, account_number, 
          institution_name, is_active, created_at
        FROM financial_accounts
        WHERE is_active = true
      `;
      
      const params = [];
      
      if (chamaId) {
        query += ' AND chama_id = $1';
        params.push(chamaId);
      }
      
      query += ' ORDER BY type, name';
      
      const result = await client.query(query, params);
      
      res.json({
        message: 'Accounts retrieved successfully',
        accounts: result.rows,
        count: result.rows.length
      });
      
    } catch (error) {
      console.error('List accounts error:', error);
      res.status(500).json({
        error: 'Failed to retrieve accounts',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/accounts
 * Create a new financial account
 */
router.post(
  '/',
  authenticateToken,
  [
    body('chama_id').isInt(),
    body('name').trim().notEmpty().isLength({ min: 3, max: 255 }),
    body('type').isIn(['bank', 'investment', 'cash']),
    body('currency_code').optional().isLength({ min: 3, max: 3 }),
    body('description').optional().trim(),
    body('account_number').optional().trim(),
    body('institution_name').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      chama_id,
      name,
      type,
      currency_code = 'KES',
      description,
      account_number,
      institution_name
    } = req.body;

    const client = await req.app.locals.pool.connect();

    try {
      // Check if account with same name exists for this chama
      const existingAccount = await client.query(
        'SELECT id FROM financial_accounts WHERE chama_id = $1 AND name = $2',
        [chama_id, name]
      );

      if (existingAccount.rows.length > 0) {
        return res.status(409).json({
          error: 'Account exists',
          message: 'An account with this name already exists for this chama'
        });
      }

      // Insert new account
      const result = await client.query(
        `INSERT INTO financial_accounts 
         (chama_id, name, type, currency_code, description, account_number, institution_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, chama_id, name, type, currency_code, current_balance, created_at`,
        [chama_id, name, type, currency_code, description, account_number, institution_name]
      );

      const account = result.rows[0];

      res.status(201).json({
        message: 'Account created successfully',
        account
      });

    } catch (error) {
      console.error('Create account error:', error);
      res.status(500).json({
        error: 'Failed to create account',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/accounts/:id/movements
 * Add a movement (deposit, withdrawal, interest, fee) to an account
 */
router.post(
  '/:id/movements',
  authenticateToken,
  [
    body('chama_id').isInt(),
    body('movement_type').isIn(['deposit', 'withdrawal', 'interest', 'fee', 'transfer']),
    body('amount').isFloat({ min: 0.01 }),
    body('description').optional().trim(),
    body('movement_date').isISO8601(),
    body('reference_number').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const accountId = req.params.id;
    const {
      chama_id,
      movement_type,
      amount,
      description,
      movement_date,
      reference_number
    } = req.body;

    const userId = req.user.userId;
    const client = await req.app.locals.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify account exists and belongs to chama
      const accountCheck = await client.query(
        'SELECT id, current_balance FROM financial_accounts WHERE id = $1 AND chama_id = $2',
        [accountId, chama_id]
      );

      if (accountCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Account not found',
          message: 'Account does not exist or does not belong to this chama'
        });
      }

      const currentBalance = parseFloat(accountCheck.rows[0].current_balance);

      // Prevent negative balance for withdrawals/fees
      if (['withdrawal', 'fee'].includes(movement_type)) {
        if (currentBalance < parseFloat(amount)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'Insufficient funds',
            message: `Current balance (${currentBalance}) is less than ${movement_type} amount (${amount})`
          });
        }
      }

      // Insert movement (trigger will update balance automatically)
      const result = await client.query(
        `INSERT INTO account_movements 
         (chama_id, account_id, movement_type, amount, description, movement_date, reference_number, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, movement_type, amount, movement_date, created_at`,
        [chama_id, accountId, movement_type, amount, description, movement_date, reference_number, userId]
      );

      // Get updated balance
      const updatedAccount = await client.query(
        'SELECT current_balance FROM financial_accounts WHERE id = $1',
        [accountId]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Movement recorded successfully',
        movement: result.rows[0],
        new_balance: updatedAccount.rows[0].current_balance
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Record movement error:', error);
      res.status(500).json({
        error: 'Failed to record movement',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/accounts/:id/summary
 * Get account summary with deposits, interest, and current value
 */
router.get(
  '/:id/summary',
  authenticateToken,
  async (req, res) => {
    const accountId = req.params.id;
    const client = await req.app.locals.pool.connect();

    try {
      // Get account details
      const accountResult = await client.query(
        `SELECT id, name, type, current_balance, currency_code 
         FROM financial_accounts WHERE id = $1`,
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Account not found'
        });
      }

      const account = accountResult.rows[0];

      // Get movement summary
      const summaryResult = await client.query(
        `SELECT 
           movement_type,
           COUNT(*) as transaction_count,
           SUM(amount) as total_amount
         FROM account_movements
         WHERE account_id = $1
         GROUP BY movement_type`,
        [accountId]
      );

      const summary = {
        deposits: 0,
        withdrawals: 0,
        interest: 0,
        fees: 0
      };

      summaryResult.rows.forEach(row => {
        if (row.movement_type === 'deposit') summary.deposits = parseFloat(row.total_amount);
        if (row.movement_type === 'withdrawal') summary.withdrawals = parseFloat(row.total_amount);
        if (row.movement_type === 'interest') summary.interest = parseFloat(row.total_amount);
        if (row.movement_type === 'fee') summary.fees = parseFloat(row.total_amount);
      });

      // Calculate gain
      const totalIn = summary.deposits + summary.interest;
      const totalOut = summary.withdrawals + summary.fees;
      const netGain = summary.interest - summary.fees;

      res.json({
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          current_balance: parseFloat(account.current_balance),
          currency: account.currency_code
        },
        summary: {
          total_deposits: summary.deposits,
          total_withdrawals: summary.withdrawals,
          total_interest: summary.interest,
          total_fees: summary.fees,
          net_gain: netGain,
          total_in: totalIn,
          total_out: totalOut
        }
      });

    } catch (error) {
      console.error('Get account summary error:', error);
      res.status(500).json({
        error: 'Failed to retrieve account summary',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/investments/portfolio
 * Get portfolio summary for all investment accounts
 */
router.get(
  '/investments/portfolio',
  authenticateToken,
  [query('chama_id').optional().isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await req.app.locals.pool.connect();

    try {
      const chamaId = req.query.chama_id;

      let query = `
        SELECT 
          fa.id,
          fa.name,
          fa.current_balance,
          fa.institution_name,
          COALESCE(SUM(CASE WHEN am.movement_type = 'deposit' THEN am.amount ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN am.movement_type = 'interest' THEN am.amount ELSE 0 END), 0) as total_interest,
          COALESCE(SUM(CASE WHEN am.movement_type = 'fee' THEN am.amount ELSE 0 END), 0) as total_fees
        FROM financial_accounts fa
        LEFT JOIN account_movements am ON fa.id = am.account_id
        WHERE fa.type = 'investment' AND fa.is_active = true
      `;

      const params = [];
      if (chamaId) {
        query += ' AND fa.chama_id = $1';
        params.push(chamaId);
      }

      query += ' GROUP BY fa.id, fa.name, fa.current_balance, fa.institution_name ORDER BY fa.name';

      const result = await client.query(query, params);

      const investments = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        institution: row.institution_name,
        deposits_total: parseFloat(row.total_deposits),
        current_balance: parseFloat(row.current_balance),
        interest_earned: parseFloat(row.total_interest),
        fees_paid: parseFloat(row.total_fees),
        total_gain: parseFloat(row.total_interest) - parseFloat(row.total_fees),
        roi_percentage: row.total_deposits > 0 
          ? (((parseFloat(row.total_interest) - parseFloat(row.total_fees)) / parseFloat(row.total_deposits)) * 100).toFixed(2)
          : '0.00'
      }));

      const totals = {
        total_investments: investments.length,
        total_deposits: investments.reduce((sum, inv) => sum + inv.deposits_total, 0),
        total_current_value: investments.reduce((sum, inv) => sum + inv.current_balance, 0),
        total_interest: investments.reduce((sum, inv) => sum + inv.interest_earned, 0),
        total_fees: investments.reduce((sum, inv) => sum + inv.fees_paid, 0),
        total_gain: investments.reduce((sum, inv) => sum + inv.total_gain, 0)
      };

      res.json({
        message: 'Investment portfolio retrieved successfully',
        investments,
        totals
      });

    } catch (error) {
      console.error('Get portfolio error:', error);
      res.status(500).json({
        error: 'Failed to retrieve investment portfolio',
        message: error.message
      });
    } finally {
      client.release();
    }
  }
);

export default router;
