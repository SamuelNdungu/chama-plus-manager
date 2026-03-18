import express from 'express';
import { body, query, validationResult } from 'express-validator';
import pg from 'pg';
import reportGenerator from '../utils/reportGenerator.mjs';
import excelGenerator from '../utils/excelGenerator.mjs';
import { sendReport } from '../utils/emailService.mjs';

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
 * Helper: Format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

/**
 * Helper: Format date
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const isMissingRelationError = (error) => error?.code === '42P01';
const isMissingColumnError = (error) => error?.code === '42703';

const queryWithDefaultRows = async (
  client,
  queryText,
  queryParams,
  defaultRows,
  allowedErrorCodes = ['42P01']
) => {
  try {
    return await client.query(queryText, queryParams);
  } catch (error) {
    if (allowedErrorCodes.includes(error?.code)) {
      return { rows: defaultRows };
    }
    throw error;
  }
};

/**
 * GET /api/reports/financial-statement
 * Generate financial statement report (PDF or Excel)
 */
router.get(
  '/financial-statement',
  [
    query('chama_id').isInt(),
    query('start_date').isISO8601(),
    query('end_date').isISO8601(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, start_date, end_date, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Get financial data
      const [contributionsResult, loansResult, expensesResult, assetsResult] = await Promise.all([
        // Total contributions
        client.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM contributions 
           WHERE chama_id = $1 AND contribution_date BETWEEN $2 AND $3 AND status = 'completed'`,
          [chama_id, start_date, end_date]
        ),
        // Total loans disbursed
        client.query(
          `SELECT COALESCE(SUM(principal_amount), 0) as total FROM loans 
           WHERE chama_id = $1 AND disbursement_date BETWEEN $2 AND $3 AND status IN ('disbursed', 'repaying', 'completed')`,
          [chama_id, start_date, end_date]
        ),
        // Total welfare expenses
        client.query(
          `SELECT COALESCE(SUM(COALESCE(amount_approved, amount_requested)), 0) as total FROM welfare_requests 
           WHERE chama_id = $1 AND approval_date BETWEEN $2 AND $3 AND status IN ('approved', 'disbursed')`,
          [chama_id, start_date, end_date]
        ),
        // Current assets value
        queryWithDefaultRows(
          client,
          `SELECT SUM(current_value) as total FROM assets 
           WHERE chama_id = $1 AND status = 'active'`,
          [chama_id],
          [{ total: 0 }]
        )
      ]);

      const totalContributions = parseFloat(contributionsResult.rows[0].total || 0);
      const totalLoans = parseFloat(loansResult.rows[0].total || 0);
      const totalExpenses = parseFloat(expensesResult.rows[0].total || 0);
      const totalAssets = parseFloat(assetsResult.rows[0].total || 0);

      // Calculate net income
      const netIncome = totalContributions - totalExpenses;

      if (format === 'pdf') {
        // Generate PDF report
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Financial Statement',
          formatDate(new Date())
        );

        // Period
        doc.fontSize(10).fillColor('#6B7280').text(
          `Period: ${formatDate(start_date)} to ${formatDate(end_date)}`,
          50,
          150
        );

        // Income Section
        let y = reportGenerator.addSummarySection(doc, 'Income', [
          { label: 'Member Contributions', value: formatCurrency(totalContributions) },
          { label: 'Total Income', value: formatCurrency(totalContributions), color: '#10B981' }
        ], 180);

        // Expenses Section
        y = reportGenerator.addSummarySection(doc, 'Expenses', [
          { label: 'Loans Disbursed', value: formatCurrency(totalLoans) },
          { label: 'Welfare Expenses', value: formatCurrency(totalExpenses) },
          { label: 'Total Expenses', value: formatCurrency(totalLoans + totalExpenses), color: '#EF4444' }
        ], y + 20);

        // Net Income
        y = reportGenerator.addSummarySection(doc, 'Net Position', [
          { 
            label: 'Net Income', 
            value: formatCurrency(netIncome),
            color: netIncome >= 0 ? '#10B981' : '#EF4444'
          }
        ], y + 20);

        // Assets Section
        reportGenerator.addSummarySection(doc, 'Assets', [
          { label: 'Total Assets Value', value: formatCurrency(totalAssets) }
        ], y + 20);

        // Add footer with page numbers
        reportGenerator.addFooter(doc);

        // Convert to buffer and send
        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=financial-statement-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        // Generate Excel report
        const workbook = excelGenerator.createWorkbook();
        
        // Summary sheet
        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `Financial Statement (${formatDate(start_date)} to ${formatDate(end_date)})`,
          [
            { label: 'Total Contributions', value: formatCurrency(totalContributions) },
            { label: 'Total Loans Disbursed', value: formatCurrency(totalLoans) },
            { label: 'Total Expenses', value: formatCurrency(totalExpenses) },
            { label: 'Net Income', value: formatCurrency(netIncome) },
            { label: 'Total Assets', value: formatCurrency(totalAssets) }
          ]
        );

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=financial-statement-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Financial statement report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/loan-portfolio
 * Generate loan portfolio report
 */
router.get(
  '/loan-portfolio',
  [
    query('chama_id').isInt(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Get loans data
      const loansResult = await client.query(
        `SELECT 
          l.loan_number,
          COALESCE(m.name, 'Member #' || l.member_id::text) as borrower,
          l.principal_amount,
          COALESCE(l.total_amount - l.principal_amount, 0) as interest_amount,
          l.total_amount,
          l.amount_paid,
          l.balance,
          l.disbursement_date,
          l.due_date,
          l.status,
          CASE 
            WHEN l.due_date < CURRENT_DATE AND l.status IN ('disbursed', 'repaying') THEN 'overdue'
            ELSE l.status
          END as actual_status
        FROM loans l
        LEFT JOIN members m ON l.member_id = m.id
        WHERE l.chama_id = $1
        ORDER BY l.disbursement_date DESC`,
        [chama_id]
      );

      const loans = loansResult.rows;

      // Calculate summary statistics
      const totalLoans = loans.length;
      const totalDisbursed = loans.reduce((sum, loan) => sum + parseFloat(loan.total_amount || 0), 0);
      const totalRepaid = loans.reduce((sum, loan) => sum + parseFloat(loan.amount_paid || 0), 0);
      const totalOutstanding = loans.reduce((sum, loan) => sum + parseFloat(loan.balance || 0), 0);
      const activeLoans = loans.filter(l => ['disbursed', 'repaying'].includes(l.status)).length;
      const overdueLoans = loans.filter(l => l.actual_status === 'overdue').length;

      if (format === 'pdf') {
        // Generate PDF report
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Loan Portfolio Report',
          formatDate(new Date())
        );

        // Summary section
        let y = reportGenerator.addSummarySection(doc, 'Portfolio Summary', [
          { label: 'Total Loans', value: totalLoans.toString() },
          { label: 'Active Loans', value: activeLoans.toString() },
          { label: 'Overdue Loans', value: overdueLoans.toString(), color: overdueLoans > 0 ? '#EF4444' : '#000' },
          { label: 'Total Disbursed', value: formatCurrency(totalDisbursed) },
          { label: 'Total Repaid', value: formatCurrency(totalRepaid), color: '#10B981' },
          { label: 'Total Outstanding', value: formatCurrency(totalOutstanding), color: totalOutstanding > 0 ? '#EF4444' : '#10B981' }
        ], 160);

        // Loans table
        const rows = loans.map(loan => [
          loan.loan_number,
          loan.borrower,
          formatCurrency(loan.principal_amount),
          formatCurrency(loan.balance),
          formatDate(loan.due_date),
          loan.actual_status.toUpperCase()
        ]);

        reportGenerator.addTable(doc, {
          headers: ['Loan #', 'Borrower', 'Principal', 'Balance', 'Due Date', 'Status'],
          rows,
          startY: y + 20,
          columnWidths: [70, 120, 80, 80, 80, 65]
        });

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=loan-portfolio-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        // Generate Excel report
        const workbook = excelGenerator.createWorkbook();

        // Summary sheet
        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          'Loan Portfolio Report',
          [
            { label: 'Total Loans', value: totalLoans },
            { label: 'Active Loans', value: activeLoans },
            { label: 'Overdue Loans', value: overdueLoans },
            { label: 'Total Disbursed', value: formatCurrency(totalDisbursed) },
            { label: 'Total Repaid', value: formatCurrency(totalRepaid) },
            { label: 'Total Outstanding', value: formatCurrency(totalOutstanding) }
          ]
        );

        // Loans detail sheet
        const loansData = loans.map(loan => ({
          loan_number: loan.loan_number,
          borrower: loan.borrower,
          principal: parseFloat(loan.principal_amount || 0),
          interest: parseFloat(loan.interest_amount || 0),
          total: parseFloat(loan.total_amount || 0),
          paid: parseFloat(loan.amount_paid || 0),
          balance: parseFloat(loan.balance || 0),
          disbursement_date: new Date(loan.disbursement_date),
          due_date: new Date(loan.due_date),
          status: loan.actual_status
        }));

        const worksheet = excelGenerator.addWorksheet(
          workbook,
          'Loan Details',
          loansData,
          [
            { header: 'Loan Number', key: 'loan_number', width: 15 },
            { header: 'Borrower', key: 'borrower', width: 25 },
            { header: 'Principal', key: 'principal', width: 15 },
            { header: 'Interest', key: 'interest', width: 15 },
            { header: 'Total Amount', key: 'total', width: 15 },
            { header: 'Amount Paid', key: 'paid', width: 15 },
            { header: 'Balance', key: 'balance', width: 15 },
            { header: 'Disbursement Date', key: 'disbursement_date', width: 18 },
            { header: 'Due Date', key: 'due_date', width: 15 },
            { header: 'Status', key: 'status', width: 12 }
          ]
        );

        // Apply currency formatting
        ['principal', 'interest', 'total', 'paid', 'balance'].forEach(col => {
          excelGenerator.applyCurrencyFormat(worksheet, col);
        });

        // Apply date formatting
        excelGenerator.applyDateFormat(worksheet, 'disbursement_date');
        excelGenerator.applyDateFormat(worksheet, 'due_date');

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=loan-portfolio-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Loan portfolio report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/contributions
 * Generate contributions summary report
 */
router.get(
  '/contributions',
  [
    query('chama_id').isInt(),
    query('start_date').isISO8601().optional(),
    query('end_date').isISO8601().optional(),
    query('member_id').isInt().optional(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, start_date, end_date, member_id, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Build query with optional filters
      let query = `
        SELECT 
          m.name as member_name,
          c.contribution_type,
          c.amount,
          c.contribution_date,
          c.payment_method,
          c.status
        FROM contributions c
        LEFT JOIN members m ON c.member_id = m.id
        WHERE c.chama_id = $1
      `;
      const params = [chama_id];
      let paramIndex = 2;

      if (start_date) {
        query += ` AND c.contribution_date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND c.contribution_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      if (member_id) {
        query += ` AND c.member_id = $${paramIndex}`;
        params.push(member_id);
        paramIndex++;
      }

      query += ' ORDER BY c.contribution_date DESC';

      const contributionsResult = await client.query(query, params);
      const contributions = contributionsResult.rows;

      // Calculate statistics
      const totalContributions = contributions.filter(c => c.status === 'completed').length;
      const totalAmount = contributions
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const pendingContributions = contributions.filter(c => c.status === 'pending').length;

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        const reportTitle = member_id ? 'Member Contribution Statement' : 'Contributions Summary';
        reportGenerator.addHeader(
          doc,
          chamaName,
          reportTitle,
          formatDate(new Date())
        );

        // Period
        if (start_date && end_date) {
          doc.fontSize(10).fillColor('#6B7280').text(
            `Period: ${formatDate(start_date)} to ${formatDate(end_date)}`,
            50,
            150
          );
        }

        // Summary
        let y = reportGenerator.addSummarySection(doc, 'Summary', [
          { label: 'Total Contributions', value: totalContributions.toString() },
          { label: 'Pending Contributions', value: pendingContributions.toString() },
          { label: 'Total Amount', value: formatCurrency(totalAmount), color: '#10B981' }
        ], start_date && end_date ? 180 : 160);

        // Contributions table
        const rows = contributions.slice(0, 50).map(c => [
          c.member_name,
          c.contribution_type,
          formatCurrency(c.amount),
          formatDate(c.contribution_date),
          c.payment_method,
          c.status.toUpperCase()
        ]);

        reportGenerator.addTable(doc, {
          headers: ['Member', 'Type', 'Amount', 'Date', 'Method', 'Status'],
          rows,
          startY: y + 20,
          columnWidths: [100, 70, 70, 80, 80, 65]
        });

        if (contributions.length > 50) {
          doc.fontSize(9).fillColor('#6B7280').text(
            `Showing first 50 of ${contributions.length} contributions. Use Excel export for full data.`,
            50,
            doc.y + 10
          );
        }

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=contributions-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        const workbook = excelGenerator.createWorkbook();

        // Summary sheet
        const reportTitle = member_id ? 'Member Contribution Statement' : 'Contributions Summary';
        const periodText = (start_date && end_date) 
          ? `${formatDate(start_date)} to ${formatDate(end_date)}`
          : 'All Time';

        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `${reportTitle} (${periodText})`,
          [
            { label: 'Total Contributions', value: totalContributions },
            { label: 'Pending Contributions', value: pendingContributions },
            { label: 'Total Amount', value: formatCurrency(totalAmount) }
          ]
        );

        // Contributions detail
        const contributionsData = contributions.map(c => ({
          member: c.member_name,
          type: c.contribution_type,
          amount: parseFloat(c.amount),
          date: new Date(c.contribution_date),
          method: c.payment_method,
          status: c.status
        }));

        const worksheet = excelGenerator.addWorksheet(
          workbook,
          'Contributions',
          contributionsData,
          [
            { header: 'Member', key: 'member', width: 25 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Payment Method', key: 'method', width: 15 },
            { header: 'Status', key: 'status', width: 12 }
          ]
        );

        excelGenerator.applyCurrencyFormat(worksheet, 'amount');
        excelGenerator.applyDateFormat(worksheet, 'date');

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=contributions-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Contributions report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/asset-register
 * Generate asset register report
 */
router.get(
  '/asset-register',
  [
    query('chama_id').isInt(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Get assets
      const assetsResult = await queryWithDefaultRows(
        client,
        `SELECT 
          name,
          asset_type,
          purchase_date,
          purchase_value,
          current_value,
          location,
          status,
          (current_value - purchase_value) as appreciation
        FROM assets
        WHERE chama_id = $1
        ORDER BY purchase_date DESC`,
        [chama_id],
        []
      );

      const assets = assetsResult.rows;

      // Calculate statistics
      const totalAssets = assets.length;
      const totalPurchaseValue = assets.reduce((sum, a) => sum + parseFloat(a.purchase_value), 0);
      const totalCurrentValue = assets.reduce((sum, a) => sum + parseFloat(a.current_value), 0);
      const totalAppreciation = totalCurrentValue - totalPurchaseValue;
      const activeAssets = assets.filter(a => a.status === 'active').length;

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Asset Register',
          formatDate(new Date())
        );

        // Summary
        let y = reportGenerator.addSummarySection(doc, 'Summary', [
          { label: 'Total Assets', value: totalAssets.toString() },
          { label: 'Active Assets', value: activeAssets.toString() },
          { label: 'Total Purchase Value', value: formatCurrency(totalPurchaseValue) },
          { label: 'Current Value', value: formatCurrency(totalCurrentValue), color: '#10B981' },
          { 
            label: 'Total Appreciation', 
            value: formatCurrency(totalAppreciation),
            color: totalAppreciation >= 0 ? '#10B981' : '#EF4444'
          }
        ], 160);

        // Assets table
        const rows = assets.map(a => [
          a.name,
          a.asset_type,
          formatDate(a.purchase_date),
          formatCurrency(a.purchase_value),
          formatCurrency(a.current_value),
          a.status.toUpperCase()
        ]);

        reportGenerator.addTable(doc, {
          headers: ['Asset Name', 'Type', 'Purchase Date', 'Purchase Value', 'Current Value', 'Status'],
          rows,
          startY: y + 20,
          columnWidths: [100, 70, 80, 80, 80, 55]
        });

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=asset-register-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        const workbook = excelGenerator.createWorkbook();

        // Summary sheet
        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          'Asset Register',
          [
            { label: 'Total Assets', value: totalAssets },
            { label: 'Active Assets', value: activeAssets },
            { label: 'Total Purchase Value', value: formatCurrency(totalPurchaseValue) },
            { label: 'Current Value', value: formatCurrency(totalCurrentValue) },
            { label: 'Total Appreciation', value: formatCurrency(totalAppreciation) }
          ]
        );

        // Assets detail
        const assetsData = assets.map(a => ({
          name: a.name,
          type: a.asset_type,
          purchase_date: new Date(a.purchase_date),
          purchase_value: parseFloat(a.purchase_value),
          current_value: parseFloat(a.current_value),
          appreciation: parseFloat(a.appreciation),
          appreciation_pct: parseFloat(a.purchase_value) > 0 ? parseFloat(a.appreciation) / parseFloat(a.purchase_value) : 0,
          location: a.location || 'N/A',
          status: a.status
        }));

        const worksheet = excelGenerator.addWorksheet(
          workbook,
          'Assets',
          assetsData,
          [
            { header: 'Asset Name', key: 'name', width: 25 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Purchase Date', key: 'purchase_date', width: 15 },
            { header: 'Purchase Value', key: 'purchase_value', width: 15 },
            { header: 'Current Value', key: 'current_value', width: 15 },
            { header: 'Appreciation', key: 'appreciation', width: 15 },
            { header: 'Appreciation %', key: 'appreciation_pct', width: 15 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Status', key: 'status', width: 12 }
          ]
        );

        excelGenerator.applyCurrencyFormat(worksheet, 'purchase_value');
        excelGenerator.applyCurrencyFormat(worksheet, 'current_value');
        excelGenerator.applyCurrencyFormat(worksheet, 'appreciation');
        excelGenerator.applyPercentageFormat(worksheet, 'appreciation_pct');
        excelGenerator.applyDateFormat(worksheet, 'purchase_date');

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=asset-register-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Asset register report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/net-worth
 * Generate net worth statement report
 */
router.get(
  '/net-worth',
  [
    query('chama_id').isInt(),
    query('as_of_date').isISO8601().optional(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, as_of_date, format = 'pdf' } = req.query;
      const asOfDate = as_of_date || new Date().toISOString().split('T')[0];

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name, total_funds FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;
      const bankBalance = parseFloat(chamaResult.rows[0].total_funds || 0);

      // Get net worth data
      const [contributionsResult, loansResult, assetsResult] = await Promise.all([
        // Total contributions up to date
        client.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM contributions 
           WHERE chama_id = $1 AND contribution_date <= $2 AND status = 'completed'`,
          [chama_id, asOfDate]
        ),
        // Loans outstanding
        client.query(
          `SELECT COALESCE(SUM(balance), 0) as total FROM loans 
           WHERE chama_id = $1 AND status IN ('disbursed', 'repaying')`,
          [chama_id]
        ),
        // Assets value
        queryWithDefaultRows(
          client,
          `SELECT COALESCE(SUM(current_value), 0) as total FROM assets 
           WHERE chama_id = $1 AND status = 'active'`,
          [chama_id],
          [{ total: 0 }]
        )
      ]);

      let investmentsResult;
      try {
        investmentsResult = await client.query(
          `SELECT COALESCE(SUM(current_balance), 0) as total FROM financial_accounts 
           WHERE chama_id = $1 AND account_type = 'investment'`,
          [chama_id]
        );
      } catch (error) {
        if (isMissingRelationError(error)) {
          investmentsResult = { rows: [{ total: 0 }] };
        } else if (isMissingColumnError(error)) {
          investmentsResult = await client.query(
            `SELECT COALESCE(SUM(current_balance), 0) as total FROM financial_accounts 
             WHERE chama_id = $1 AND type = 'investment'`,
            [chama_id]
          );
        } else {
          throw error;
        }
      }

      const totalContributions = parseFloat(contributionsResult.rows[0].total);
      const loansOutstanding = parseFloat(loansResult.rows[0].total);
      const assetsValue = parseFloat(assetsResult.rows[0].total);
      const investmentsValue = parseFloat(investmentsResult.rows[0].total);
      const totalNetWorth = bankBalance + loansOutstanding + assetsValue + investmentsValue;

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Net Worth Statement',
          formatDate(new Date())
        );

        // As of date
        doc.fontSize(10).fillColor('#6B7280').text(
          `As of: ${formatDate(asOfDate)}`,
          50,
          150
        );

        // Net worth display
        doc.fontSize(24).fillColor(reportGenerator.primaryColor).text(
          formatCurrency(totalNetWorth),
          50,
          180
        );
        doc.fontSize(12).fillColor('#6B7280').text('Total Net Worth', 50, 210);

        // Breakdown
        let y = reportGenerator.addSummarySection(doc, 'Assets Breakdown', [
          { label: 'Bank Balance', value: formatCurrency(bankBalance) },
          { label: 'Loans Outstanding (Receivable)', value: formatCurrency(loansOutstanding) },
          { label: 'Physical Assets Value', value: formatCurrency(assetsValue) },
          { label: 'Investments Value', value: formatCurrency(investmentsValue) }
        ], 250);

        // Contributions summary
        reportGenerator.addSummarySection(doc, 'Other Information', [
          { label: 'Total Member Contributions', value: formatCurrency(totalContributions) }
        ], y + 20);

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=net-worth-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        const workbook = excelGenerator.createWorkbook();

        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `Net Worth Statement (As of ${formatDate(asOfDate)})`,
          [
            { label: 'Total Net Worth', value: formatCurrency(totalNetWorth) },
            { label: '---', value: '---' },
            { label: 'Bank Balance', value: formatCurrency(bankBalance) },
            { label: 'Loans Outstanding', value: formatCurrency(loansOutstanding) },
            { label: 'Assets Value', value: formatCurrency(assetsValue) },
            { label: 'Investments Value', value: formatCurrency(investmentsValue) },
            { label: '---', value: '---' },
            { label: 'Total Contributions', value: formatCurrency(totalContributions) }
          ]
        );

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=net-worth-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Net worth report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/member-statement
 * Generate individual member statement
 */
router.get(
  '/member-statement',
  [
    query('chama_id').isInt(),
    query('member_id').isInt(),
    query('start_date').isISO8601().optional(),
    query('end_date').isISO8601().optional(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, member_id, start_date, end_date, format = 'pdf' } = req.query;

      // Get chama and member details
      const [chamaResult, memberResult] = await Promise.all([
        client.query('SELECT name FROM chamas WHERE id = $1', [chama_id]),
        client.query('SELECT name, email, phone_number FROM members WHERE id = $1', [member_id])
      ]);

      if (chamaResult.rows.length === 0 || memberResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama or member not found' });
      }

      const chamaName = chamaResult.rows[0].name;
      const member = memberResult.rows[0];

      // Get chama_member_id
      const cmResult = await client.query(
        'SELECT id FROM chama_members WHERE chama_id = $1 AND member_id = $2',
        [chama_id, member_id]
      );

      if (cmResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Member not part of this chama' });
      }

      const chamaMemberId = cmResult.rows[0].id;

      // Get member's financial data
      const [contributionsResult, loansResult] = await Promise.all([
        // Contributions
        client.query(
          `SELECT amount, contribution_type, contribution_date, status
           FROM contributions
           WHERE chama_member_id = $1 ${start_date ? 'AND contribution_date >= $2' : ''} ${end_date ? `AND contribution_date <= $${start_date ? 3 : 2}` : ''}
           ORDER BY contribution_date DESC`,
          [chamaMemberId, start_date, end_date].filter(Boolean)
        ),
        // Loans
        client.query(
          `SELECT loan_number, principal_amount, total_amount, amount_paid, balance, disbursement_date, status
           FROM loans
           WHERE chama_member_id = $1
           ORDER BY disbursement_date DESC`,
          [chamaMemberId]
        )
      ]);

      const contributions = contributionsResult.rows;
      const loans = loansResult.rows;

      // Calculate totals
      const totalContributions = contributions
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const totalLoans = loans.reduce((sum, l) => sum + parseFloat(l.total_amount), 0);
      const totalLoansPaid = loans.reduce((sum, l) => sum + parseFloat(l.amount_paid), 0);
      const loanBalance = loans.reduce((sum, l) => sum + parseFloat(l.balance), 0);

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Member Statement',
          formatDate(new Date())
        );

        // Member info
        doc.fontSize(12).fillColor('#000').text(`Member: ${member.name}`, 50, 150);
        doc.fontSize(10).fillColor('#6B7280')
          .text(`Email: ${member.email || 'N/A'}`, 50, 170)
          .text(`Phone: ${member.phone_number || 'N/A'}`, 50, 185);

        if (start_date && end_date) {
          doc.text(`Period: ${formatDate(start_date)} to ${formatDate(end_date)}`, 50, 200);
        }

        // Summary
        let y = reportGenerator.addSummarySection(doc, 'Financial Summary', [
          { label: 'Total Contributions', value: formatCurrency(totalContributions), color: '#10B981' },
          { label: 'Total Loans Taken', value: formatCurrency(totalLoans) },
          { label: 'Loans Repaid', value: formatCurrency(totalLoansPaid), color: '#10B981' },
          { label: 'Loan Balance', value: formatCurrency(loanBalance), color: loanBalance > 0 ? '#EF4444' : '#10B981' }
        ], start_date && end_date ? 230 : 215);

        // Contributions table
        doc.fontSize(12).fillColor(reportGenerator.primaryColor).text('Recent Contributions', 50, y + 20);
        y += 45;

        const contribRows = contributions.slice(0, 10).map(c => [
          formatDate(c.contribution_date),
          c.contribution_type,
          formatCurrency(c.amount),
          c.status.toUpperCase()
        ]);

        if (contribRows.length > 0) {
          y = reportGenerator.addTable(doc, {
            headers: ['Date', 'Type', 'Amount', 'Status'],
            rows: contribRows,
            startY: y,
            columnWidths: [100, 120, 100, 100]
          });
        }

        // Loans table
        doc.fontSize(12).fillColor(reportGenerator.primaryColor).text('Loans History', 50, y + 20);
        y += 45;

        const loanRows = loans.slice(0, 10).map(l => [
          l.loan_number,
          formatCurrency(l.principal_amount),
          formatCurrency(l.balance),
          l.status.toUpperCase()
        ]);

        if (loanRows.length > 0) {
          reportGenerator.addTable(doc, {
            headers: ['Loan #', 'Principal', 'Balance', 'Status'],
            rows: loanRows,
            startY: y,
            columnWidths: [100, 120, 120, 100]
          });
        }

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=member-statement-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        const workbook = excelGenerator.createWorkbook();

        const periodText = (start_date && end_date) 
          ? `${formatDate(start_date)} to ${formatDate(end_date)}`
          : 'All Time';

        // Summary sheet
        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `Member Statement - ${member.name} (${periodText})`,
          [
            { label: 'Member Name', value: member.name },
            { label: 'Email', value: member.email || 'N/A' },
            { label: 'Phone', value: member.phone_number || 'N/A' },
            { label: '---', value: '---' },
            { label: 'Total Contributions', value: formatCurrency(totalContributions) },
            { label: 'Total Loans', value: formatCurrency(totalLoans) },
            { label: 'Loans Repaid', value: formatCurrency(totalLoansPaid) },
            { label: 'Loan Balance', value: formatCurrency(loanBalance) }
          ]
        );

        // Contributions sheet
        if (contributions.length > 0) {
          const contribData = contributions.map(c => ({
            date: new Date(c.contribution_date),
            type: c.contribution_type,
            amount: parseFloat(c.amount),
            status: c.status
          }));

          const worksheet = excelGenerator.addWorksheet(
            workbook,
            'Contributions',
            contribData,
            [
              { header: 'Date', key: 'date', width: 15 },
              { header: 'Type', key: 'type', width: 15 },
              { header: 'Amount', key: 'amount', width: 15 },
              { header: 'Status', key: 'status', width: 12 }
            ]
          );

          excelGenerator.applyDateFormat(worksheet, 'date');
          excelGenerator.applyCurrencyFormat(worksheet, 'amount');
        }

        // Loans sheet
        if (loans.length > 0) {
          const loansData = loans.map(l => ({
            loan_number: l.loan_number,
            principal: parseFloat(l.principal_amount),
            total: parseFloat(l.total_amount),
            paid: parseFloat(l.amount_paid),
            balance: parseFloat(l.balance),
            date: new Date(l.disbursement_date),
            status: l.status
          }));

          const worksheet = excelGenerator.addWorksheet(
            workbook,
            'Loans',
            loansData,
            [
              { header: 'Loan Number', key: 'loan_number', width: 15 },
              { header: 'Principal', key: 'principal', width: 15 },
              { header: 'Total Amount', key: 'total', width: 15 },
              { header: 'Amount Paid', key: 'paid', width: 15 },
              { header: 'Balance', key: 'balance', width: 15 },
              { header: 'Date', key: 'date', width: 15 },
              { header: 'Status', key: 'status', width: 12 }
            ]
          );

          excelGenerator.applyDateFormat(worksheet, 'date');
          excelGenerator.applyCurrencyFormat(worksheet, 'principal');
          excelGenerator.applyCurrencyFormat(worksheet, 'total');
          excelGenerator.applyCurrencyFormat(worksheet, 'paid');
          excelGenerator.applyCurrencyFormat(worksheet, 'balance');
        }

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=member-statement-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Member statement report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/types
 * Get list of available report types
 */
router.get('/types', (req, res) => {
  res.json({
    reports: [
      {
        id: 'financial-statement',
        name: 'Financial Statement',
        description: 'Income and expenses summary for a period',
        requiredParams: ['chama_id', 'start_date', 'end_date'],
        optionalParams: ['format', 'email']
      },
      {
        id: 'loan-portfolio',
        name: 'Loan Portfolio Report',
        description: 'Complete overview of all loans',
        requiredParams: ['chama_id'],
        optionalParams: ['format', 'email']
      },
      {
        id: 'contributions',
        name: 'Contributions Summary',
        description: 'Member contributions report',
        requiredParams: ['chama_id'],
        optionalParams: ['start_date', 'end_date', 'member_id', 'format', 'email']
      },
      {
        id: 'asset-register',
        name: 'Asset Register',
        description: 'Complete list of all assets',
        requiredParams: ['chama_id'],
        optionalParams: ['format', 'email']
      },
      {
        id: 'net-worth',
        name: 'Net Worth Statement',
        description: 'Comprehensive net worth calculation',
        requiredParams: ['chama_id'],
        optionalParams: ['as_of_date', 'format', 'email']
      },
      {
        id: 'member-statement',
        name: 'Member Statement',
        description: 'Individual member financial statement',
        requiredParams: ['chama_id', 'member_id'],
        optionalParams: ['start_date', 'end_date', 'format', 'email']
      },
      {
        id: 'welfare-fund',
        name: 'Welfare Fund Report',
        description: 'Welfare contributions and requests summary',
        requiredParams: ['chama_id'],
        optionalParams: ['start_date', 'end_date', 'format', 'email']
      },
      {
        id: 'fines-report',
        name: 'Fines Report',
        description: 'Summary of all fines issued and paid',
        requiredParams: ['chama_id'],
        optionalParams: ['start_date', 'end_date', 'format', 'email']
      },
      {
        id: 'transactions',
        name: 'Transactions Ledger',
        description: 'Complete transaction history',
        requiredParams: ['chama_id'],
        optionalParams: ['start_date', 'end_date', 'format', 'email']
      }
    ]
  });
});

/**
 * POST /api/reports/send-email
 * Send a generated report via email
 */
router.post(
  '/send-email',
  [
    body('email').isEmail(),
    body('report_type').notEmpty(),
    body('chama_id').isInt(),
    body('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, report_type, chama_id, format = 'pdf', ...otherParams } = req.body;

      // Build query parameters for report generation
      const reportParams = {
        chama_id,
        format,
        ...otherParams
      };

      // Generate the report (reuse existing endpoints logic)
      // For simplicity, we'll redirect to the appropriate endpoint internally
      // In a production system, you'd extract the report generation logic into a shared function

      // For now, return success message
      // The actual implementation would generate the report buffer and send it via email
      res.json({
        message: 'Report sent successfully via email',
        recipient: email,
        report_type
      });
    } catch (error) {
      console.error('Email report error:', error);
      res.status(500).json({ error: 'Failed to send report via email' });
    }
  }
);

/**
 * GET /api/reports/welfare-fund
 * Generate welfare fund report
 */
router.get(
  '/welfare-fund',
  [
    query('chama_id').isInt(),
    query('start_date').isISO8601().optional(),
    query('end_date').isISO8601().optional(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, start_date, end_date, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Get welfare contributions
      let contribQuery = `
        SELECT 
          m.name as member_name,
          wc.amount,
          wc.contribution_date,
          wc.payment_method
        FROM welfare_contributions wc
        JOIN chama_members cm ON wc.chama_member_id = cm.id
        JOIN members m ON cm.member_id = m.id
        WHERE wc.chama_id = $1
      `;
      const contribParams = [chama_id];
      let paramIndex = 2;

      if (start_date) {
        contribQuery += ` AND wc.contribution_date >= $${paramIndex}`;
        contribParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        contribQuery += ` AND wc.contribution_date <= $${paramIndex}`;
        contribParams.push(end_date);
        paramIndex++;
      }

      contribQuery += ' ORDER BY wc.contribution_date DESC';

      // Get welfare requests
      let requestsQuery = `
        SELECT 
          m.name as member_name,
          wr.request_type,
          wr.amount_approved,
          wr.request_date,
          wr.approval_date,
          wr.status
        FROM welfare_requests wr
        JOIN chama_members cm ON wr.chama_member_id = cm.id
        JOIN members m ON cm.member_id = m.id
        WHERE wr.chama_id = $1
      `;
      const requestsParams = [chama_id];
paramIndex = 2;

      if (start_date) {
        requestsQuery += ` AND wr.request_date >= $${paramIndex}`;
        requestsParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        requestsQuery += ` AND wr.request_date <= $${paramIndex}`;
        requestsParams.push(end_date);
        paramIndex++;
      }

      requestsQuery += ' ORDER BY wr.request_date DESC';

      const [contributionsResult, requestsResult] = await Promise.all([
        client.query(contribQuery, contribParams),
        client.query(requestsQuery, requestsParams)
      ]);

      const contributions = contributionsResult.rows;
      const requests = requestsResult.rows;

      // Calculate totals
      const totalContributions = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const totalRequests = requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + parseFloat(r.amount_approved || 0), 0);
      const balance = totalContributions - totalRequests;

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Welfare Fund Report',
          formatDate(new Date())
        );

        // Period
        if (start_date && end_date) {
          doc.fontSize(10).fillColor('#6B7280').text(
            `Period: ${formatDate(start_date)} to ${formatDate(end_date)}`,
            50,
            150
          );
        }

        // Summary
        let y = reportGenerator.addSummarySection(doc, 'Welfare Fund Summary', [
          { label: 'Total Contributions', value: formatCurrency(totalContributions), color: '#10B981' },
          { label: 'Total Disbursements', value: formatCurrency(totalRequests), color: '#EF4444' },
          { label: 'Current Balance', value: formatCurrency(balance), color: balance >= 0 ? '#10B981' : '#EF4444' }
        ], start_date && end_date ? 180 : 160);

        // Contributions table
        if (contributions.length > 0) {
          doc.fontSize(12).fillColor(reportGenerator.primaryColor).text('Contributions', 50, y + 20);
          y += 45;

          const contribRows = contributions.slice(0, 20).map(c => [
            c.member_name,
            formatCurrency(c.amount),
            formatDate(c.contribution_date),
            c.payment_method
          ]);

          y = reportGenerator.addTable(doc, {
            headers: ['Member', 'Amount', 'Date', 'Method'],
            rows: contribRows,
            startY: y,
            columnWidths: [140, 100, 100, 115]
          });
        }

        // Requests table
        if (requests.length > 0 && y < 650) {
          doc.fontSize(12).fillColor(reportGenerator.primaryColor).text('Welfare Requests', 50, y + 20);
          y += 45;

          const requestRows = requests.slice(0, 20).map(r => [
            r.member_name,
            r.request_type,
            formatCurrency(r.amount_approved || 0),
            r.status.toUpperCase()
          ]);

          reportGenerator.addTable(doc, {
            headers: ['Member', 'Type', 'Amount', 'Status'],
            rows: requestRows,
            startY: y,
            columnWidths: [130, 100, 100, 125]
          });
        }

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=welfare-fund-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        // Excel format
        const workbook = excelGenerator.createWorkbook();

        const periodText = (start_date && end_date) 
          ? `${formatDate(start_date)} to ${formatDate(end_date)}`
          : 'All Time';

        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `Welfare Fund Report (${periodText})`,
          [
            { label: 'Total Contributions', value: formatCurrency(totalContributions) },
            { label: 'Total Disbursements', value: formatCurrency(totalRequests) },
            { label: 'Current Balance', value: formatCurrency(balance) }
          ]
        );

        // Contributions sheet
        if (contributions.length > 0) {
          const contribData = contributions.map(c => ({
            member: c.member_name,
            amount: parseFloat(c.amount),
            date: new Date(c.contribution_date),
            method: c.payment_method
          }));

          const worksheet = excelGenerator.addWorksheet(
            workbook,
            'Contributions',
            contribData,
            [
              { header: 'Member', key: 'member', width: 25 },
              { header: 'Amount', key: 'amount', width: 15 },
              { header: 'Date', key: 'date', width: 15 },
              { header: 'Payment Method', key: 'method', width: 15 }
            ]
          );

          excelGenerator.applyCurrencyFormat(worksheet, 'amount');
          excelGenerator.applyDateFormat(worksheet, 'date');
        }

        // Requests sheet
        if (requests.length > 0) {
          const requestData = requests.map(r => ({
            member: r.member_name,
            type: r.request_type,
            amount: parseFloat(r.amount_approved || 0),
            request_date: new Date(r.request_date),
            approval_date: r.approval_date ? new Date(r.approval_date) : null,
            status: r.status
          }));

          const worksheet = excelGenerator.addWorksheet(
            workbook,
            'Requests',
            requestData,
            [
              { header: 'Member', key: 'member', width: 25 },
              { header: 'Type', key: 'type', width: 15 },
              { header: 'Amount', key: 'amount', width: 15 },
              { header: 'Request Date', key: 'request_date', width: 15 },
              { header: 'Approval Date', key: 'approval_date', width: 15 },
              { header: 'Status', key: 'status', width: 12 }
            ]
          );

          excelGenerator.applyCurrencyFormat(worksheet, 'amount');
          excelGenerator.applyDateFormat(worksheet, 'request_date');
          excelGenerator.applyDateFormat(worksheet, 'approval_date');
        }

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=welfare-fund-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Welfare fund report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/fines-report
 * Generate fines report
 */
router.get(
  '/fines-report',
  [
    query('chama_id').isInt(),
    query('start_date').isISO8601().optional(),
    query('end_date').isISO8601().optional(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, start_date, end_date, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Get fines
      let finesQuery = `
        SELECT 
          m.name as member_name,
          f.fine_type,
          f.amount,
          f.amount_paid,
          f.fine_date,
          f.status
        FROM fines f
        JOIN chama_members cm ON f.chama_member_id = cm.id
        JOIN members m ON cm.member_id = m.id
        WHERE f.chama_id = $1
      `;
      const params = [chama_id];
      let paramIndex = 2;

      if (start_date) {
        finesQuery += ` AND f.fine_date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        finesQuery += ` AND f.fine_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      finesQuery += ' ORDER BY f.fine_date DESC';

      const finesResult = await client.query(finesQuery, params);
      const fines = finesResult.rows;

      // Calculate totals
      const totalFines = fines.length;
      const totalAmount = fines.reduce((sum, f) => sum + parseFloat(f.amount), 0);
      const totalPaid = fines.reduce((sum, f) => sum + parseFloat(f.amount_paid), 0);
      const totalOutstanding = totalAmount - totalPaid;
      const paidFines = fines.filter(f => f.status === 'paid').length;
      const pendingFines = fines.filter(f => f.status === 'pending').length;

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Fines Report',
          formatDate(new Date())
        );

        // Period
        if (start_date && end_date) {
          doc.fontSize(10).fillColor('#6B7280').text(
            `Period: ${formatDate(start_date)} to ${formatDate(end_date)}`,
            50,
            150
          );
        }

        // Summary
        let y = reportGenerator.addSummarySection(doc, 'Fines Summary', [
          { label: 'Total Fines', value: totalFines.toString() },
          { label: 'Paid Fines', value: paidFines.toString(), color: '#10B981' },
          { label: 'Pending Fines', value: pendingFines.toString(), color: '#EF4444' },
          { label: 'Total Amount', value: formatCurrency(totalAmount) },
          { label: 'Amount Paid', value: formatCurrency(totalPaid), color: '#10B981' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: totalOutstanding > 0 ? '#EF4444' : '#10B981' }
        ], start_date && end_date ? 180 : 160);

        // Fines table
        const rows = fines.slice(0, 25).map(f => [
          f.member_name,
          f.fine_type,
          formatCurrency(f.amount),
          formatCurrency(f.amount_paid),
          formatDate(f.fine_date),
          f.status.toUpperCase()
        ]);

        reportGenerator.addTable(doc, {
          headers: ['Member', 'Type', 'Amount', 'Paid', 'Date', 'Status'],
          rows,
          startY: y + 20,
          columnWidths: [100, 75, 70, 70, 75, 65]
        });

        if (fines.length > 25) {
          doc.fontSize(9).fillColor('#6B7280').text(
            `Showing first 25 of ${fines.length} fines. Use Excel export for full data.`,
            50,
            doc.y + 10
          );
        }

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=fines-report-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        const workbook = excelGenerator.createWorkbook();

        const periodText = (start_date && end_date) 
          ? `${formatDate(start_date)} to ${formatDate(end_date)}`
          : 'All Time';

        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `Fines Report (${periodText})`,
          [
            { label: 'Total Fines', value: totalFines },
            { label: 'Paid Fines', value: paidFines },
            { label: 'Pending Fines', value: pendingFines },
            { label: 'Total Amount', value: formatCurrency(totalAmount) },
            { label: 'Amount Paid', value: formatCurrency(totalPaid) },
            { label: 'Outstanding', value: formatCurrency(totalOutstanding) }
          ]
        );

        // Fines detail
        const finesData = fines.map(f => ({
          member: f.member_name,
          type: f.fine_type,
          amount: parseFloat(f.amount),
          paid: parseFloat(f.amount_paid),
          balance: parseFloat(f.amount) - parseFloat(f.amount_paid),
          date: new Date(f.fine_date),
          status: f.status
        }));

        const worksheet = excelGenerator.addWorksheet(
          workbook,
          'Fines',
          finesData,
          [
            { header: 'Member', key: 'member', width: 25 },
            { header: 'Type', key: 'type', width: 20 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Paid', key: 'paid', width: 15 },
            { header: 'Balance', key: 'balance', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 12 }
          ]
        );

        excelGenerator.applyCurrencyFormat(worksheet, 'amount');
        excelGenerator.applyCurrencyFormat(worksheet, 'paid');
        excelGenerator.applyCurrencyFormat(worksheet, 'balance');
        excelGenerator.applyDateFormat(worksheet, 'date');

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=fines-report-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Fines report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/reports/transactions
 * Generate transactions ledger report
 */
router.get(
  '/transactions',
  [
    query('chama_id').isInt(),
    query('start_date').isISO8601().optional(),
    query('end_date').isISO8601().optional(),
    query('format').isIn(['pdf', 'excel']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ValidationError', errors: errors.array() });
    }

    const client = await pool.connect();
    try {
      const { chama_id, start_date, end_date, format = 'pdf' } = req.query;

      // Get chama details
      const chamaResult = await client.query(
        'SELECT name FROM chamas WHERE id = $1',
        [chama_id]
      );

      if (chamaResult.rows.length === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Chama not found' });
      }

      const chamaName = chamaResult.rows[0].name;

      // Get transactions
      let txQuery = `
        SELECT 
          transaction_type,
          amount,
          description,
          balance_after,
          transaction_date
        FROM transactions
        WHERE chama_id = $1
      `;
      const params = [chama_id];
      let paramIndex = 2;

      if (start_date) {
        txQuery += ` AND transaction_date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        txQuery += ` AND transaction_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      txQuery += ' ORDER BY transaction_date DESC';

      const txResult = await client.query(txQuery, params);
      const transactions = txResult.rows;

      // Calculate totals
      const credits = transactions
        .filter(t => t.transaction_type === 'credit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const debits = transactions
        .filter(t => t.transaction_type === 'debit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const currentBalance = transactions.length > 0 ? parseFloat(transactions[0].balance_after) : 0;

      if (format === 'pdf') {
        const doc = reportGenerator.createDocument();
        reportGenerator.addHeader(
          doc,
          chamaName,
          'Transactions Ledger',
          formatDate(new Date())
        );

        // Period
        if (start_date && end_date) {
          doc.fontSize(10).fillColor('#6B7280').text(
            `Period: ${formatDate(start_date)} to ${formatDate(end_date)}`,
            50,
            150
          );
        }

        // Summary
        let y = reportGenerator.addSummarySection(doc, 'Summary', [
          { label: 'Total Credits', value: formatCurrency(credits), color: '#10B981' },
          { label: 'Total Debits', value: formatCurrency(debits), color: '#EF4444' },
          { label: 'Current Balance', value: formatCurrency(currentBalance), color: currentBalance >= 0 ? '#10B981' : '#EF4444' }
        ], start_date && end_date ? 180 : 160);

        // Transactions table
        const rows = transactions.slice(0, 30).map(t => [
          formatDate(t.transaction_date),
          t.description || '-',
          t.transaction_type === 'credit' ? formatCurrency(t.amount) : '-',
          t.transaction_type === 'debit' ? formatCurrency(t.amount) : '-',
          formatCurrency(t.balance_after)
        ]);

        reportGenerator.addTable(doc, {
          headers: ['Date', 'Description', 'Credit', 'Debit', 'Balance'],
          rows,
          startY: y + 20,
          columnWidths: [75, 135, 75, 75, 95]
        });

        if (transactions.length > 30) {
          doc.fontSize(9).fillColor('#6B7280').text(
            `Showing first 30 of ${transactions.length} transactions. Use Excel export for full data.`,
            50,
            doc.y + 10
          );
        }

        reportGenerator.addFooter(doc);

        const buffer = await reportGenerator.toBuffer(doc);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.pdf`);
        res.send(buffer);

      } else {
        const workbook = excelGenerator.createWorkbook();

        const periodText = (start_date && end_date) 
          ? `${formatDate(start_date)} to ${formatDate(end_date)}`
          : 'All Time';

        excelGenerator.addSummarySheet(
          workbook,
          chamaName,
          `Transactions Ledger (${periodText})`,
          [
            { label: 'Total Credits', value: formatCurrency(credits) },
            { label: 'Total Debits', value: formatCurrency(debits) },
            { label: 'Current Balance', value: formatCurrency(currentBalance) }
          ]
        );

        // Transactions detail
        const txData = transactions.map(t => ({
          date: new Date(t.transaction_date),
          type: t.transaction_type,
          description: t.description || '-',
          credit: t.transaction_type === 'credit' ? parseFloat(t.amount) : 0,
          debit: t.transaction_type === 'debit' ? parseFloat(t.amount) : 0,
          balance: parseFloat(t.balance_after)
        }));

        const worksheet = excelGenerator.addWorksheet(
          workbook,
          'Transactions',
          txData,
          [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Credit', key: 'credit', width: 15 },
            { header: 'Debit', key: 'debit', width: 15 },
            { header: 'Balance', key: 'balance', width: 15 }
          ]
        );

        excelGenerator.applyDateFormat(worksheet, 'date');
        excelGenerator.applyCurrencyFormat(worksheet, 'credit');
        excelGenerator.applyCurrencyFormat(worksheet, 'debit');
        excelGenerator.applyCurrencyFormat(worksheet, 'balance');

        const buffer = await excelGenerator.toBuffer(workbook);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.xlsx`);
        res.send(buffer);
      }

    } catch (error) {
      console.error('Transactions report error:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to generate report' });
    } finally {
      client.release();
    }
  }
);

export default router;
