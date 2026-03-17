import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.mjs';

dotenv.config();

const router = express.Router();
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Generate unique loan number
const generateLoanNumber = async (chamaId) => {
  const prefix = 'LN';
  const year = new Date().getFullYear();
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT COUNT(*) as count FROM loans WHERE chama_id = $1 AND EXTRACT(YEAR FROM application_date) = $2',
      [chamaId, year]
    );
    const count = parseInt(result.rows[0].count) + 1;
    const loanNumber = `${prefix}${year}${chamaId.toString().padStart(3, '0')}${count.toString().padStart(4, '0')}`;
    return loanNumber;
  } finally {
    client.release();
  }
};

/**
 * GET /api/loans
 * List all loans with optional filters
 * Query params: chama_id, member_id, status, limit, offset
 */
router.get('/',
  authenticateToken,
  [
    query('chama_id').optional().isInt(),
    query('member_id').optional().isInt(),
    query('status').optional().isIn(['pending', 'approved', 'disbursed', 'repaying', 'completed', 'defaulted']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { chama_id, member_id, status, limit = 50, offset = 0 } = req.query;
      
      let queryText = `
        SELECT 
          l.*,
          m.name as member_name,
          m.phone as member_phone,
          m.id_number as member_id_number,
          g1.name as guarantor1_name,
          g2.name as guarantor2_name,
          ap.name as approved_by_name,
          dis.name as disbursed_by_name
        FROM loans l
        INNER JOIN members m ON l.member_id = m.id
        LEFT JOIN members g1 ON l.guarantor1_id = g1.id
        LEFT JOIN members g2 ON l.guarantor2_id = g2.id
        LEFT JOIN members ap ON l.approved_by = ap.id
        LEFT JOIN members dis ON l.disbursed_by = dis.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramCount = 1;
      
      if (chama_id) {
        queryText += ` AND l.chama_id = $${paramCount}`;
        queryParams.push(chama_id);
        paramCount++;
      }
      
      if (member_id) {
        queryText += ` AND l.member_id = $${paramCount}`;
        queryParams.push(member_id);
        paramCount++;
      }
      
      if (status) {
        queryText += ` AND l.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }
      
      queryText += ` ORDER BY l.application_date DESC, l.created_at DESC`;
      queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);
      
      const result = await client.query(queryText, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM loans l WHERE 1=1';
      const countParams = [];
      let countParamNum = 1;
      
      if (chama_id) {
        countQuery += ` AND l.chama_id = $${countParamNum}`;
        countParams.push(chama_id);
        countParamNum++;
      }
      if (member_id) {
        countQuery += ` AND l.member_id = $${countParamNum}`;
        countParams.push(member_id);
        countParamNum++;
      }
      if (status) {
        countQuery += ` AND l.status = $${countParamNum}`;
        countParams.push(status);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);
      
      res.json({
        loans: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + result.rows.length < total
        }
      });
    } catch (error) {
      console.error('Error fetching loans:', error);
      res.status(500).json({ error: 'Failed to fetch loans', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/loans
 * Create new loan application
 */
router.post('/',
  authenticateToken,
  [
    body('chama_id').isInt(),
    body('member_id').isInt(),
    body('principal_amount').isDecimal(),
    body('interest_rate').isDecimal(),
    body('loan_purpose').notEmpty().trim(),
    body('loan_type').optional().isIn(['emergency', 'development', 'school_fees', 'business', 'other']),
    body('repayment_period').isInt({ min: 1, max: 60 }),
    body('guarantor1_id').isInt(),
    body('guarantor2_id').isInt(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        chama_id,
        member_id,
        principal_amount,
        interest_rate,
        loan_purpose,
        loan_type = 'other',
        repayment_period,
        guarantor1_id,
        guarantor2_id,
        notes
      } = req.body;
      
      // Validate guarantors are different from applicant
      if (guarantor1_id === member_id || guarantor2_id === member_id) {
        return res.status(400).json({ error: 'Guarantors cannot be the same as the loan applicant' });
      }
      
      if (guarantor1_id === guarantor2_id) {
        return res.status(400).json({ error: 'Guarantors must be different members' });
      }
      
      // Check if member belongs to chama
      const memberCheck = await client.query(
        'SELECT id FROM chama_members WHERE chama_id = $1 AND member_id = $2 AND is_active = true',
        [chama_id, member_id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Member does not belong to this chama' });
      }
      
      // Check for existing pending/active loans
      const existingLoanCheck = await client.query(
        `SELECT id FROM loans 
         WHERE chama_id = $1 AND member_id = $2 
         AND status IN ('pending', 'approved', 'disbursed', 'repaying')`,
        [chama_id, member_id]
      );
      
      if (existingLoanCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Member already has an active loan',
          message: 'Cannot apply for a new loan while having a pending or active loan'
        });
      }
      
      // Get chama settings for maximum loan amount
      const chamaSettings = await client.query(
        'SELECT maximum_loan_amount, loan_interest_rate FROM chamas WHERE id = $1',
        [chama_id]
      );
      
      if (chamaSettings.rows.length === 0) {
        return res.status(404).json({ error: 'Chama not found' });
      }
      
      const maxLoanAmount = chamaSettings.rows[0].maximum_loan_amount;
      if (maxLoanAmount && parseFloat(principal_amount) > parseFloat(maxLoanAmount)) {
        return res.status(400).json({ 
          error: 'Loan amount exceeds maximum allowed',
          maxAmount: maxLoanAmount
        });
      }
      
      // Calculate total amount and monthly repayment
      const principal = parseFloat(principal_amount);
      const rate = parseFloat(interest_rate);
      const months = parseInt(repayment_period);
      
      const totalInterest = (principal * rate * months) / 100;
      const totalAmount = principal + totalInterest;
      const monthlyRepayment = totalAmount / months;
      
      // Calculate due date
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + months);
      
      // Generate loan number
      const loanNumber = await generateLoanNumber(chama_id);
      
      // Insert loan
      const result = await client.query(
        `INSERT INTO loans (
          chama_id, member_id, loan_number, principal_amount, interest_rate,
          total_amount, balance, loan_purpose, loan_type, due_date,
          repayment_period, monthly_repayment, guarantor1_id, guarantor2_id,
          status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          chama_id, member_id, loanNumber, principal, rate,
          totalAmount, totalAmount, loan_purpose, loan_type, dueDate,
          months, monthlyRepayment, guarantor1_id, guarantor2_id,
          'pending', notes || null
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Loan application submitted successfully',
        loan: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating loan:', error);
      res.status(500).json({ error: 'Failed to create loan application', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/loans/:id
 * Get loan details with payment history
 */
router.get('/:id',
  authenticateToken,
  [param('id').isInt()],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      
      // Get loan details
      const loanResult = await client.query(
        `SELECT 
          l.*,
          m.name as member_name,
          m.phone as member_phone,
          m.email as member_email,
          m.id_number as member_id_number,
          g1.name as guarantor1_name,
          g1.phone as guarantor1_phone,
          g2.name as guarantor2_name,
          g2.phone as guarantor2_phone,
          ap.name as approved_by_name,
          dis.name as disbursed_by_name,
          c.name as chama_name
        FROM loans l
        INNER JOIN members m ON l.member_id = m.id
        INNER JOIN chamas c ON l.chama_id = c.id
        LEFT JOIN members g1 ON l.guarantor1_id = g1.id
        LEFT JOIN members g2 ON l.guarantor2_id = g2.id
        LEFT JOIN members ap ON l.approved_by = ap.id
        LEFT JOIN members dis ON l.disbursed_by = dis.id
        WHERE l.id = $1`,
        [id]
      );
      
      if (loanResult.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      // Get payment history
      const paymentsResult = await client.query(
        `SELECT 
          lp.*,
          m.name as recorded_by_name
        FROM loan_payments lp
        LEFT JOIN members m ON lp.recorded_by = m.id
        WHERE lp.loan_id = $1
        ORDER BY lp.payment_date DESC, lp.created_at DESC`,
        [id]
      );
      
      res.json({
        loan: loanResult.rows[0],
        payments: paymentsResult.rows
      });
    } catch (error) {
      console.error('Error fetching loan details:', error);
      res.status(500).json({ error: 'Failed to fetch loan details', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/loans/:id/approve
 * Approve a loan application
 */
router.put('/:id/approve',
  authenticateToken,
  [
    param('id').isInt(),
    body('approved_by').isInt(),
    body('approved_amount').optional().isDecimal(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { approved_by, approved_amount, notes } = req.body;
      
      // Check loan exists and is pending
      const loanCheck = await client.query(
        'SELECT * FROM loans WHERE id = $1',
        [id]
      );
      
      if (loanCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      const loan = loanCheck.rows[0];
      
      if (loan.status !== 'pending') {
        return res.status(400).json({ 
          error: 'Invalid loan status',
          message: `Loan is already ${loan.status}. Only pending loans can be approved.`
        });
      }
      
      // If approved amount is different, recalculate
      let updateFields = {
        status: 'approved',
        approved_by,
        approval_date: new Date(),
        notes: notes || loan.notes
      };
      
      if (approved_amount && parseFloat(approved_amount) !== parseFloat(loan.principal_amount)) {
        const principal = parseFloat(approved_amount);
        const rate = parseFloat(loan.interest_rate);
        const months = parseInt(loan.repayment_period);
        
        const totalInterest = (principal * rate * months) / 100;
        const totalAmount = principal + totalInterest;
        const monthlyRepayment = totalAmount / months;
        
        updateFields.principal_amount = principal;
        updateFields.total_amount = totalAmount;
        updateFields.balance = totalAmount;
        updateFields.monthly_repayment = monthlyRepayment;
      }
      
      // Update loan
      const setClause = Object.keys(updateFields)
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(', ');
      
      const values = [id, ...Object.values(updateFields)];
      
      const result = await client.query(
        `UPDATE loans SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: 'Loan approved successfully',
        loan: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving loan:', error);
      res.status(500).json({ error: 'Failed to approve loan', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/loans/:id/disburse
 * Disburse an approved loan
 */
router.put('/:id/disburse',
  authenticateToken,
  [
    param('id').isInt(),
    body('disbursed_by').isInt(),
    body('disbursement_method').optional().isIn(['cash', 'mpesa', 'bank_transfer']),
    body('reference_number').optional().trim(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { disbursed_by, disbursement_method, reference_number, notes } = req.body;
      
      // Check loan exists and is approved
      const loanCheck = await client.query(
        'SELECT * FROM loans WHERE id = $1',
        [id]
      );
      
      if (loanCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      const loan = loanCheck.rows[0];
      
      if (loan.status !== 'approved') {
        return res.status(400).json({ 
          error: 'Invalid loan status',
          message: `Loan must be approved before disbursement. Current status: ${loan.status}`
        });
      }
      
      // Update loan status to disbursed
      const result = await client.query(
        `UPDATE loans 
         SET status = 'repaying', 
             disbursed_by = $2, 
             disbursement_date = NOW(),
             notes = $3,
             updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [id, disbursed_by, notes || loan.notes]
      );
      
      // Update chama total_loans
      await client.query(
        'UPDATE chamas SET total_loans = total_loans + $1 WHERE id = $2',
        [loan.principal_amount, loan.chama_id]
      );
      
      // Update member total_loans in chama_members
      await client.query(
        'UPDATE chama_members SET total_loans = total_loans + $1 WHERE chama_id = $2 AND member_id = $3',
        [loan.principal_amount, loan.chama_id, loan.member_id]
      );
      
      // Create transaction record
      await client.query(
        `INSERT INTO transactions (
          chama_id, transaction_type, amount, transaction_date,
          description, reference_number, category, created_by
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)`,
        [
          loan.chama_id,
          'debit',
          loan.principal_amount,
          `Loan disbursement: ${loan.loan_number}`,
          reference_number || loan.loan_number,
          'loan_disbursement',
          disbursed_by
        ]
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: 'Loan disbursed successfully',
        loan: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error disbursing loan:', error);
      res.status(500).json({ error: 'Failed to disburse loan', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/loans/:id/payments
 * Record a loan payment
 */
router.post('/:id/payments',
  authenticateToken,
  [
    param('id').isInt(),
    body('amount').isDecimal(),
    body('payment_method').isIn(['cash', 'mpesa', 'bank_transfer']),
    body('payment_date').optional().isISO8601(),
    body('reference_number').optional().trim(),
    body('receipt_number').optional().trim(),
    body('recorded_by').isInt(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const {
        amount,
        payment_method,
        payment_date = new Date(),
        reference_number,
        receipt_number,
        recorded_by,
        notes
      } = req.body;
      
      // Get loan details
      const loanResult = await client.query(
        'SELECT * FROM loans WHERE id = $1',
        [id]
      );
      
      if (loanResult.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      const loan = loanResult.rows[0];
      
      if (loan.status !== 'repaying' && loan.status !== 'disbursed') {
        return res.status(400).json({ 
          error: 'Invalid loan status',
          message: 'Can only record payments for disbursed or repaying loans'
        });
      }
      
      const paymentAmount = parseFloat(amount);
      const currentBalance = parseFloat(loan.balance);
      
      if (paymentAmount > currentBalance) {
        return res.status(400).json({ 
          error: 'Payment exceeds loan balance',
          balance: currentBalance
        });
      }
      
      // Calculate principal and interest portions
      // Simple proportional split based on original loan structure
      const principalAmount = parseFloat(loan.principal_amount);
      const totalAmount = parseFloat(loan.total_amount);
      const interestAmount = totalAmount - principalAmount;
      
      const principalRatio = principalAmount / totalAmount;
      const interestRatio = interestAmount / totalAmount;
      
      const principalPaid = paymentAmount * principalRatio;
      const interestPaid = paymentAmount * interestRatio;
      
      // Record payment
      const paymentResult = await client.query(
        `INSERT INTO loan_payments (
          loan_id, amount, payment_date, payment_method,
          reference_number, receipt_number, principal_paid,
          interest_paid, penalty_paid, recorded_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          id, paymentAmount, payment_date, payment_method,
          reference_number, receipt_number, principalPaid,
          interestPaid, 0, recorded_by, notes
        ]
      );
      
      // Update loan balance and amount_paid
      const newBalance = currentBalance - paymentAmount;
      const newAmountPaid = parseFloat(loan.amount_paid) + paymentAmount;
      
      let newStatus = loan.status;
      if (newBalance === 0) {
        newStatus = 'completed';
      } else if (loan.status === 'disbursed') {
        newStatus =' repaying';
      }
      
      await client.query(
        `UPDATE loans 
         SET amount_paid = $1, balance = $2, status = $3, updated_at = NOW()
         WHERE id = $4`,
        [newAmountPaid, newBalance, newStatus, id]
      );
      
      // Create transaction record
      await client.query(
        `INSERT INTO transactions (
          chama_id, transaction_type, amount, transaction_date,
          description, reference_number, category, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          loan.chama_id,
          'credit',
          paymentAmount,
          payment_date,
          `Loan repayment: ${loan.loan_number}`,
          reference_number || receipt_number,
          'loan_repayment',
          recorded_by
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Payment recorded successfully',
        payment: paymentResult.rows[0],
        newBalance: newBalance,
        loanStatus: newStatus
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording loan payment:', error);
      res.status(500).json({ error: 'Failed to record payment', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/loans/:id/payments
 * Get loan payment history
 */
router.get('/:id/payments',
  authenticateToken,
  [param('id').isInt()],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      
      const result = await client.query(
        `SELECT 
          lp.*,
          m.name as recorded_by_name
        FROM loan_payments lp
        LEFT JOIN members m ON lp.recorded_by = m.id
        WHERE lp.loan_id = $1
        ORDER BY lp.payment_date DESC, lp.created_at DESC`,
        [id]
      );
      
      res.json({ payments: result.rows });
    } catch (error) {
      console.error('Error fetching loan payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/loans/summary
 * Get loans summary statistics for a chama
 * Query params: chama_id (required)
 */
router.get('/summary/stats',
  authenticateToken,
  [query('chama_id').isInt()],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { chama_id } = req.query;
      
      const result = await client.query(
        `SELECT 
          COUNT(*) as total_loans,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_loans,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_loans,
          COUNT(*) FILTER (WHERE status IN ('disbursed', 'repaying')) as active_loans,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_loans,
          COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted_loans,
          COALESCE(SUM(principal_amount) FILTER (WHERE status IN ('disbursed', 'repaying', 'completed')), 0) as total_disbursed,
          COALESCE(SUM(amount_paid), 0) as total_repaid,
          COALESCE(SUM(balance) FILTER (WHERE status IN ('disbursed', 'repaying')), 0) as total_outstanding,
          COALESCE(SUM(total_amount - principal_amount) FILTER (WHERE status = 'completed'), 0) as total_interest_earned
        FROM loans
        WHERE chama_id = $1`,
        [chama_id]
      );
      
      res.json({ summary: result.rows[0] });
    } catch (error) {
      console.error('Error fetching loans summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/loans/:id/reject
 * Reject a pending loan application
 */
router.put('/:id/reject',
  authenticateToken,
  [
    param('id').isInt(),
    body('rejected_by').isInt(),
    body('rejection_reason').notEmpty().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { rejected_by, rejection_reason } = req.body;
      
      // Check loan exists and is pending
      const loanCheck = await client.query(
        'SELECT * FROM loans WHERE id = $1',
        [id]
      );
      
      if (loanCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      
      const loan = loanCheck.rows[0];
      
      if (loan.status !== 'pending') {
        return res.status(400).json({ 
          error: 'Invalid loan status',
          message: `Only pending loans can be rejected. Current status: ${loan.status}`
        });
      }
      
      // Update loan to rejected (we can use 'defaulted' status or add a new status)
      // For now, let's add a note indicating rejection
      const result = await client.query(
        `UPDATE loans 
         SET status = 'defaulted',
             approved_by = $2,
             approval_date = NOW(),
             notes = $3,
             updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [id, rejected_by, `REJECTED: ${rejection_reason}`]
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: 'Loan application rejected',
        loan: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error rejecting loan:', error);
      res.status(500).json({ error: 'Failed to reject loan', message: error.message });
    } finally {
      client.release();
    }
  }
);

export default router;
