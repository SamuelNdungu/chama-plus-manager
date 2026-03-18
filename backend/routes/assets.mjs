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

const isMissingRelationError = (error) => error?.code === '42P01';
const isMissingColumnError = (error) => error?.code === '42703';

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * GET /api/assets
 * List all assets with optional filters
 * Query params: chama_id, asset_type, status, limit, offset
 */
router.get('/',
  authenticateToken,
  [
    query('chama_id').optional().isInt(),
    query('asset_type').optional().isIn(['land', 'vehicle', 'building', 'equipment', 'shares', 'business', 'other']),
    query('status').optional().isIn(['active', 'sold', 'damaged', 'deprecated']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    const { chama_id, asset_type, status, limit = 50, offset = 0 } = req.query;
    
    try {
      let queryText = `
        SELECT 
          a.*,
          m.name as acquired_by_name,
          COUNT(av.id) as valuation_count,
          MAX(av.valuation_date) as last_valuation_date
        FROM assets a
        LEFT JOIN members m ON a.acquired_by = m.id
        LEFT JOIN asset_valuations av ON a.id = av.asset_id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramCount = 1;
      
      if (chama_id) {
        queryText += ` AND a.chama_id = $${paramCount}`;
        queryParams.push(chama_id);
        paramCount++;
      }
      
      if (asset_type) {
        queryText += ` AND a.asset_type = $${paramCount}`;
        queryParams.push(asset_type);
        paramCount++;
      }
      
      if (status) {
        queryText += ` AND a.status = $${paramCount}`;
        queryParams.push(status);
        paramCount++;
      }
      
      queryText += ` GROUP BY a.id, m.name`;
      queryText += ` ORDER BY a.created_at DESC`;
      queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);
      
      const result = await client.query(queryText, queryParams);
      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM assets a WHERE 1=1';
      const countParams = [];
      let countParamNum = 1;
      
      if (chama_id) {
        countQuery += ` AND a.chama_id = $${countParamNum}`;
        countParams.push(chama_id);
        countParamNum++;
      }
      if (asset_type) {
        countQuery += ` AND a.asset_type = $${countParamNum}`;
        countParams.push(asset_type);
        countParamNum++;
      }
      if (status) {
        countQuery += ` AND a.status = $${countParamNum}`;
        countParams.push(status);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count, 10);
      
      res.json({
        assets: result.rows,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + result.rows.length < total
        }
      });
    } catch (error) {
      if (isMissingRelationError(error)) {
        return res.json({
          assets: [],
          pagination: {
            total: 0,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            hasMore: false
          }
        });
      }
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/assets
 * Create new asset
 */
router.post('/',
  authenticateToken,
  [
    body('chama_id').isInt(),
    body('name').notEmpty().trim(),
    body('asset_type').isIn(['land', 'vehicle', 'building', 'equipment', 'shares', 'business', 'other']),
    body('description').optional().trim(),
    body('purchase_date').isISO8601(),
    body('purchase_value').isDecimal(),
    body('current_value').isDecimal(),
    body('location').optional().trim(),
    body('serial_number').optional().trim(),
    body('registration_number').optional().trim(),
    body('title_deed_number').optional().trim(),
    body('land_size').optional().isDecimal(),
    body('land_unit').optional().isIn(['acres', 'hectares', 'sqm']),
    body('make').optional().trim(),
    body('model').optional().trim(),
    body('year').optional().isInt({ min: 1900, max: 2100 }),
    body('acquired_by').optional().isInt(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        chama_id,
        name,
        asset_type,
        description,
        purchase_date,
        purchase_value,
        current_value,
        location,
        serial_number,
        registration_number,
        title_deed_number,
        land_size,
        land_unit,
        make,
        model,
        year,
        acquired_by,
        notes
      } = req.body;
      
      // Insert asset
      const result = await client.query(
        `INSERT INTO assets (
          chama_id, name, asset_type, description, purchase_date,
          purchase_value, current_value, location, serial_number,
          registration_number, title_deed_number, land_size, land_unit,
          make, model, year, acquired_by, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          chama_id, name, asset_type, description || null, purchase_date,
          purchase_value, current_value, location || null, serial_number || null,
          registration_number || null, title_deed_number || null, land_size || null,
          land_unit || null, make || null, model || null, year || null,
          acquired_by || null, notes || null, 'active'
        ]
      );
      
      // Create initial valuation record
      await client.query(
        `INSERT INTO asset_valuations (
          asset_id, valuation_date, valuation_amount, valuation_method, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [result.rows[0].id, purchase_date, purchase_value, 'purchase', 'Initial purchase valuation']
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Asset created successfully',
        asset: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating asset:', error);
      res.status(500).json({ error: 'Failed to create asset', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/assets/:id
 * Get asset details with valuation history
 */
router.get('/:id',
  authenticateToken,
  async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return next();
    }

    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      
      // Get asset details
      const assetResult = await client.query(
        `SELECT 
          a.*,
          m.name as acquired_by_name,
          c.name as chama_name
        FROM assets a
        LEFT JOIN members m ON a.acquired_by = m.id
        LEFT JOIN chamas c ON a.chama_id = c.id
        WHERE a.id = $1`,
        [id]
      );
      
      if (assetResult.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Get valuation history
      const valuationsResult = await client.query(
        `SELECT 
          av.*,
          m.name as conducted_by_name
        FROM asset_valuations av
        LEFT JOIN members m ON av.conducted_by = m.id
        WHERE av.asset_id = $1
        ORDER BY av.valuation_date DESC`,
        [id]
      );
      
      // Get maintenance history
      const maintenanceResult = await client.query(
        `SELECT 
          am.*,
          m.name as recorded_by_name
        FROM asset_maintenance am
        LEFT JOIN members m ON am.recorded_by = m.id
        WHERE am.asset_id = $1
        ORDER BY am.maintenance_date DESC`,
        [id]
      );
      
      res.json({
       asset: assetResult.rows[0],
        valuations: valuationsResult.rows,
        maintenance: maintenanceResult.rows
      });
    } catch (error) {
      console.error('Error fetching asset details:', error);
      res.status(500).json({ error: 'Failed to fetch asset details', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * PUT /api/assets/:id
 * Update asset details
 */
router.put('/:id',
  authenticateToken,
  [
    param('id').isInt(),
    body('name').optional().notEmpty().trim(),
    body('description').optional().trim(),
    body('current_value').optional().isDecimal(),
    body('location').optional().trim(),
    body('status').optional().isIn(['active', 'sold', 'damaged', 'deprecated']),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Build dynamic update query
      const setClause = [];
      const values = [id];
      let paramCount = 2;
      
      Object.keys(updates).forEach(key => {
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      });
      
      if (setClause.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      const result = await client.query(
        `UPDATE assets SET ${setClause.join(', ')}, updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      res.json({
        message: 'Asset updated successfully',
        asset: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({ error: 'Failed to update asset', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * DELETE /api/assets/:id
 * Delete asset
 */
router.delete('/:id',
  authenticateToken,
  [param('id').isInt()],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      
      const result = await client.query(
        'DELETE FROM assets WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      res.json({
        message: 'Asset deleted successfully',
        asset: result.rows[0]
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: 'Failed to delete asset', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/assets/:id/valuations
 * Add new valuation for an asset
 */
router.post('/:id/valuations',
  authenticateToken,
  [
    param('id').isInt(),
    body('valuation_date').isISO8601(),
    body('valuation_amount').isDecimal(),
    body('valuation_method').isIn(['market_assessment', 'professional_appraisal', 'depreciation', 'other']),
    body('valuer_name').optional().trim(),
    body('valuer_organization').optional().trim(),
    body('conducted_by').optional().isInt(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const {
        valuation_date,
        valuation_amount,
        valuation_method,
        valuer_name,
        valuer_organization,
        conducted_by,
        notes
      } = req.body;
      
      // Check asset exists
      const assetCheck = await client.query(
        'SELECT id FROM assets WHERE id = $1',
        [id]
      );
      
      if (assetCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Insert valuation (trigger will auto-update asset current_value)
      const result = await client.query(
        `INSERT INTO asset_valuations (
          asset_id, valuation_date, valuation_amount, valuation_method,
          valuer_name, valuer_organization, conducted_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          id, valuation_date, valuation_amount, valuation_method,
          valuer_name || null, valuer_organization || null,
          conducted_by || null, notes || null
        ]
      );
      
      res.status(201).json({
        message: 'Valuation added successfully',
        valuation: result.rows[0]
      });
    } catch (error) {
      console.error('Error adding valuation:', error);
      res.status(500).json({ error: 'Failed to add valuation', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/assets/:id/maintenance
 * Add maintenance record for an asset
 */
router.post('/:id/maintenance',
  authenticateToken,
  [
    param('id').isInt(),
    body('maintenance_date').isISO8601(),
    body('maintenance_type').isIn(['repair', 'service', 'inspection', 'upgrade']),
    body('description').notEmpty().trim(),
    body('cost').optional().isDecimal(),
    body('performed_by').optional().trim(),
    body('next_maintenance_date').optional().isISO8601(),
    body('recorded_by').optional().isInt(),
    body('notes').optional().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const {
        maintenance_date,
        maintenance_type,
        description,
        cost,
        performed_by,
        next_maintenance_date,
        recorded_by,
        notes
      } = req.body;
      
      // Check asset exists
      const assetCheck = await client.query(
        'SELECT id FROM assets WHERE id = $1',
        [id]
      );
      
      if (assetCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Insert maintenance record
      const result = await client.query(
        `INSERT INTO asset_maintenance (
          asset_id, maintenance_date, maintenance_type, description,
          cost, performed_by, next_maintenance_date, recorded_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          id, maintenance_date, maintenance_type, description,
          cost || 0, performed_by || null, next_maintenance_date || null,
          recorded_by || null, notes || null
        ]
      );
      
      res.status(201).json({
        message: 'Maintenance record added successfully',
        maintenance: result.rows[0]
      });
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      res.status(500).json({ error: 'Failed to add maintenance record', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/assets/summary/stats
 * Get assets summary statistics for a chama
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
          COUNT(*) as total_assets,
          COUNT(*) FILTER (WHERE status = 'active') as active_assets,
          COUNT(*) FILTER (WHERE status = 'sold') as sold_assets,
          COALESCE(SUM(purchase_value) FILTER (WHERE status = 'active'), 0) as total_purchase_value,
          COALESCE(SUM(current_value) FILTER (WHERE status = 'active'), 0) as total_current_value,
          COALESCE(SUM(current_value - purchase_value) FILTER (WHERE status = 'active'), 0) as total_appreciation,
          COUNT(DISTINCT asset_type) FILTER (WHERE status = 'active') as asset_type_count
        FROM assets
        WHERE chama_id = $1`,
        [chama_id]
      );
      
      // Get breakdown by asset type
      const typeBreakdown = await client.query(
        `SELECT 
          asset_type,
          COUNT(*) as count,
          COALESCE(SUM(current_value), 0) as total_value
        FROM assets
        WHERE chama_id = $1 AND status = 'active'
        GROUP BY asset_type
        ORDER BY total_value DESC`,
        [chama_id]
      );
      
      res.json({
        summary: result.rows[0],
        breakdown: typeBreakdown.rows
      });
    } catch (error) {
      if (isMissingRelationError(error)) {
        return res.json({
          summary: {
            total_assets: '0',
            active_assets: '0',
            sold_assets: '0',
            total_purchase_value: '0',
            total_current_value: '0',
            total_appreciation: '0',
            asset_type_count: '0'
          },
          breakdown: []
        });
      }
      console.error('Error fetching assets summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary', message: error.message });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/assets/networth
 * Calculate total net worth for a chama
 * Query params: chama_id (required)
 */
router.get('/networth',
  authenticateToken,
  [query('chama_id').isInt()],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { chama_id } = req.query;
      
      // Get chama financial data
      const chamaResult = await client.query(
        'SELECT total_funds, total_loans, total_welfare FROM chamas WHERE id = $1',
        [chama_id]
      );
      
      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'Chama not found' });
      }
      
      const chamaData = chamaResult.rows[0];
      
      // Get total contributions (paid)
      const contributionsResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total_contributions
         FROM contributions
         WHERE chama_id = $1 AND status = 'completed'`,
        [chama_id]
      );
      
      // Get active loans outstanding
      const loansResult = await client.query(
        `SELECT COALESCE(SUM(balance), 0) as total_loans_outstanding
         FROM loans
         WHERE chama_id = $1 AND status IN ('disbursed', 'repaying')`,
        [chama_id]
      );
      
      // Get total assets value
      let assetsResult;
      try {
        assetsResult = await client.query(
          `SELECT COALESCE(SUM(current_value), 0) as total_assets_value
           FROM assets
           WHERE chama_id = $1 AND status = 'active'`,
          [chama_id]
        );
      } catch (error) {
        if (!isMissingRelationError(error)) {
          throw error;
        }
        assetsResult = { rows: [{ total_assets_value: 0 }] };
      }
      
      // Get investment portfolio value
      let investmentsResult;
      try {
        investmentsResult = await client.query(
          `SELECT COALESCE(SUM(current_balance), 0) as total_investments_value
           FROM financial_accounts
           WHERE chama_id = $1 AND account_type = 'investment' AND is_active = true`,
          [chama_id]
        );
      } catch (error) {
        if (isMissingRelationError(error)) {
          investmentsResult = { rows: [{ total_investments_value: 0 }] };
        } else if (isMissingColumnError(error)) {
          investmentsResult = await client.query(
            `SELECT COALESCE(SUM(current_balance), 0) as total_investments_value
             FROM financial_accounts
             WHERE chama_id = $1 AND type = 'investment' AND is_active = true`,
            [chama_id]
          );
        } else {
          throw error;
        }
      }
      
      const totalContributions = parseFloat(contributionsResult.rows[0].total_contributions);
      const totalLoansOutstanding = parseFloat(loansResult.rows[0].total_loans_outstanding);
      const totalAssetsValue = parseFloat(assetsResult.rows[0].total_assets_value);
      const totalInvestmentsValue = parseFloat(investmentsResult.rows[0].total_investments_value);
      const bankBalance = parseFloat(chamaData.total_funds) || 0;
      
      // Calculate net worth
      const netWorth = bankBalance + totalLoansOutstanding + totalAssetsValue + totalInvestmentsValue;
      
      res.json({
        networth: {
          total: netWorth,
          breakdown: {
            bankBalance,
            loansOutstanding: totalLoansOutstanding,
            assetsValue: totalAssetsValue,
            investmentsValue: totalInvestmentsValue,
            totalContributions
          }
        }
      });
    } catch (error) {
      console.error('Error calculating net worth:', error);
      res.status(500).json({ error: 'Failed to calculate net worth', message: error.message });
    } finally {
      client.release();
    }
  }
);

export default router;
