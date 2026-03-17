/**
 * Chamas Routes
 * CRUD endpoints for chama management
 */

import express from 'express';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.mjs';

const router = express.Router();

// GET /api/chamas - list all chamas
router.get('/', async (req, res) => {
  const client = await req.app.locals.pool.connect();

  try {
    const result = await client.query(
      `SELECT id, name, description, registration_number, registration_date,
              meeting_frequency, contribution_amount, contribution_frequency,
              loan_interest_rate, maximum_loan_amount, welfare_contribution,
              created_at, updated_at
       FROM chamas
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chamas:', error);
    res.status(500).json({
      error: 'Failed to fetch chamas',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// GET /api/chamas/:id - get chama by id
router.get('/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const result = await client.query(
      `SELECT id, name, description, registration_number, registration_date,
              meeting_frequency, contribution_amount, contribution_frequency,
              loan_interest_rate, maximum_loan_amount, welfare_contribution,
              created_at, updated_at
       FROM chamas
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chama not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching chama:', error);
    res.status(500).json({
      error: 'Failed to fetch chama',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// POST /api/chamas - create new chama
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('contributionAmount').optional().isFloat({ min: 0 }),
    body('loanInterestRate').optional().isFloat({ min: 0 }),
    body('maximumLoanAmount').optional().isFloat({ min: 0 }),
    body('welfareContribution').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const {
      name,
      description,
      registrationNumber,
      registrationDate,
      meetingFrequency,
      contributionAmount,
      contributionFrequency,
      loanInterestRate,
      maximumLoanAmount,
      welfareContribution,
    } = req.body;

    const result = await client.query(
      `INSERT INTO chamas (
         name, description, registration_number, registration_date,
         meeting_frequency, contribution_amount, contribution_frequency,
         loan_interest_rate, maximum_loan_amount, welfare_contribution
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name,
        description || null,
        registrationNumber || null,
        registrationDate || null,
        meetingFrequency || null,
        contributionAmount || 0,
        contributionFrequency || null,
        loanInterestRate || 0,
        maximumLoanAmount || null,
        welfareContribution || 0,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating chama:', error);
    res.status(500).json({
      error: 'Failed to create chama',
      message: error.message,
    });
  } finally {
    client.release();
  }
  }
);

// PUT /api/chamas/:id - update chama
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('name').trim().notEmpty(),
    body('contributionAmount').optional().isFloat({ min: 0 }),
    body('loanInterestRate').optional().isFloat({ min: 0 }),
    body('maximumLoanAmount').optional().isFloat({ min: 0 }),
    body('welfareContribution').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const {
      name,
      description,
      registrationNumber,
      registrationDate,
      meetingFrequency,
      contributionAmount,
      contributionFrequency,
      loanInterestRate,
      maximumLoanAmount,
      welfareContribution,
    } = req.body;

    const result = await client.query(
      `UPDATE chamas
       SET name = $1,
           description = $2,
           registration_number = $3,
           registration_date = $4,
           meeting_frequency = $5,
           contribution_amount = $6,
           contribution_frequency = $7,
           loan_interest_rate = $8,
           maximum_loan_amount = $9,
           welfare_contribution = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        name,
        description || null,
        registrationNumber || null,
        registrationDate || null,
        meetingFrequency || null,
        contributionAmount || 0,
        contributionFrequency || null,
        loanInterestRate || 0,
        maximumLoanAmount || null,
        welfareContribution || 0,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chama not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating chama:', error);
    res.status(500).json({
      error: 'Failed to update chama',
      message: error.message,
    });
  } finally {
    client.release();
  }
  }
);

// DELETE /api/chamas/:id - delete chama
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const result = await client.query(
      'DELETE FROM chamas WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chama not found' });
    }

    res.json({ message: 'Chama deleted successfully' });
  } catch (error) {
    console.error('Error deleting chama:', error);
    res.status(500).json({
      error: 'Failed to delete chama',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

export default router;
