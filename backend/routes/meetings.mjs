/**
 * Meetings Routes
 * CRUD endpoints for meetings and attendance
 */

import express from 'express';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.mjs';

const router = express.Router();

// GET /api/meetings - list all meetings
router.get('/', async (req, res) => {
  const client = await req.app.locals.pool.connect();

  try {
    const result = await client.query(
      `SELECT id, chama_id, meeting_number AS title, meeting_date, meeting_time, location, agenda,
              minutes, status, created_at, updated_at
       FROM meetings
       ORDER BY meeting_date DESC, meeting_time DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      error: 'Failed to fetch meetings',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// GET /api/meetings/:id - get meeting by id
router.get('/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const result = await client.query(
      `SELECT id, chama_id, meeting_number AS title, meeting_date, meeting_time, location, agenda,
              minutes, status, created_at, updated_at
       FROM meetings
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      error: 'Failed to fetch meeting',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// POST /api/meetings - create meeting
router.post(
  '/',
  [
    body('chamaId').isInt(),
    body('title').trim().notEmpty(),
    body('meetingDate').optional().isISO8601(),
    body('meetingTime').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const {
      chamaId,
      title,
      meetingNumber,
      meetingDate,
      meetingTime,
      location,
      agenda,
      minutes,
      status,
    } = req.body;

    const result = await client.query(
      `INSERT INTO meetings (
         chama_id, meeting_number, meeting_date, meeting_time, location, agenda, minutes, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        chamaId,
        meetingNumber || title || null,
        meetingDate || null,
        meetingTime || null,
        location || null,
        agenda || null,
        minutes || null,
        status || 'scheduled',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      error: 'Failed to create meeting',
      message: error.message,
    });
  } finally {
    client.release();
  }
  }
);

// PUT /api/meetings/:id - update meeting
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('chamaId').isInt(),
    body('title').trim().notEmpty(),
    body('meetingDate').optional().isISO8601(),
    body('meetingTime').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const {
      chamaId,
      title,
      meetingNumber,
      meetingDate,
      meetingTime,
      location,
      agenda,
      minutes,
      status,
    } = req.body;

    const result = await client.query(
      `UPDATE meetings
       SET chama_id = $1,
           meeting_number = $2,
           meeting_date = $3,
           meeting_time = $4,
           location = $5,
           agenda = $6,
           minutes = $7,
           status = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        chamaId,
        meetingNumber || title || null,
        meetingDate || null,
        meetingTime || null,
        location || null,
        agenda || null,
        minutes || null,
        status || 'scheduled',
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({
      error: 'Failed to update meeting',
      message: error.message,
    });
  } finally {
    client.release();
  }
  }
);

// DELETE /api/meetings/:id - delete meeting
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  const client = await req.app.locals.pool.connect();

  try {
    const { id } = req.params;
    const result = await client.query(
      'DELETE FROM meetings WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      error: 'Failed to delete meeting',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

export default router;
