import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import pkg from 'pg';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.mjs';
import chamasRoutes from './routes/chamas.mjs';
import contributionsRoutes from './routes/contributions.mjs';
import meetingsRoutes from './routes/meetings.mjs';
import obligationsRoutes from './routes/obligations.mjs';
import accountsRoutes from './routes/accounts.mjs';
import loansRoutes from './routes/loans.mjs';
import assetsRoutes from './routes/assets.mjs';
import reportsRoutes from './routes/reports.mjs';
import reportSchedulerRoutes from './routes/reportScheduler.mjs';
import { body, param } from 'express-validator';
import { handleValidationErrors } from './middleware/validate.mjs';
import { hashPassword, generateToken, generateRefreshToken } from './utils/auth.mjs';

const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '127.0.0.1'; // Only listen on localhost for nginx

// CORS configuration for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(bodyParser.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Remove these duplicate CORS lines
// app.use(cors());
// app.use(cors());

// PostgreSQL connection with environment variables
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'chamaPlus',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
});

// Make pool available to routes
app.locals.pool = pool;

// Remove incorrect URL line and connect to database
pool.connect()
  .then(() => { 
    console.log('Successfully connected to PostgreSQL database');
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Mount authentication routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
// Mount chamas routes with rate limiting
app.use('/api/chamas', apiLimiter, chamasRoutes);
// Mount contributions routes with rate limiting
app.use('/api/contributions', apiLimiter, contributionsRoutes, obligationsRoutes);
// Mount meetings routes with rate limiting
app.use('/api/meetings', apiLimiter, meetingsRoutes);
// Mount accounts routes with rate limiting
app.use('/api/accounts', apiLimiter, accountsRoutes);
// Mount loans routes with rate limiting
app.use('/api/loans', apiLimiter, loansRoutes);
// Mount assets routes with rate limiting
app.use('/api/assets', apiLimiter, assetsRoutes);
// Mount reports routes with rate limiting
app.use('/api/reports', apiLimiter, reportsRoutes);
// Mount report scheduler routes with rate limiting
app.use('/api/report-schedules', apiLimiter, reportSchedulerRoutes);

// Test endpoint to verify database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'success',
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

// API endpoint to add a member
// Remove this incorrect line
// http://localhost:3001/api/test-db 

// Fix the syntax error in the API endpoint (remove 'ready')
app.post(
  '/api/members',
  [
    body('name').trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').trim().notEmpty(),
    body('role').optional().isString(),
    body('idNumber').optional().isString(),
    body('nextOfKin.name').optional().isString(),
    body('nextOfKin.phone').optional().isString(),
    body('nextOfKin.email').optional().isEmail(),
    body('nextOfKin.relationship').optional().isString(),
    body('nextOfKin.idNumber').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      // Log the complete request body
      console.log('Complete request body:', JSON.stringify(req.body, null, 2));

      const {
        name,
        email,
        phone,
        role,
        idNumber: id_number,
        nextOfKin: {
          name: nextOfKinName,
          phone: nextOfKinPhone,
          email: nextOfKinEmail,
          relationship: nextOfKinRelationship,
          idNumber: nextOfKinIdNumber,
        } = {},
      } = req.body;

      // Log the extracted data
      console.log('Extracted data:', {
        name, email, phone, role, id_number,
        nextOfKinName, nextOfKinPhone, nextOfKinEmail,
        nextOfKinRelationship, nextOfKinIdNumber,
      });

      const result = await pool.query(
        'INSERT INTO members (name, email, phone, role, id_number, next_of_kin_name, next_of_kin_email, next_of_kin_phone, next_of_kin_relationship, next_of_kin_id_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [
          name,
          email,
          phone,
          role,
          id_number,
          nextOfKinName,
          nextOfKinPhone,
          nextOfKinEmail,
          nextOfKinRelationship,
          nextOfKinIdNumber,
        ]
      );

      console.log('Query result:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      // Enhanced error logging
      console.error('Detailed error information:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.detail) console.error('PostgreSQL error detail:', error.detail);
      if (error.code) console.error('PostgreSQL error code:', error.code);
      if (error.constraint) console.error('PostgreSQL constraint:', error.constraint);

      res.status(500).json({
        error: 'Failed to add member',
        details: error.message,
        code: error.code,
        detail: error.detail,
      });
    }
  }
);

// Add GET endpoint for fetching all members
app.get('/api/members', async (req, res) => {
  try {
    console.log('Fetching members...');
    const result = await pool.query(`
      SELECT 
        m.*,
        u.id as "hasUserId"
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.id DESC
    `);
    
    // Add hasUserAccount flag to each member
    const members = result.rows.map(member => ({
      ...member,
      hasUserAccount: !!member.hasUserId
    }));
    
    console.log('Members fetched:', members.length);
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    console.error('SQL Error details:', {
      code: error.code,
      detail: error.detail,
      table: error.table
    });
    res.status(500).json({ 
      error: 'Failed to fetch members',
      details: error.message,
      code: error.code
    });
  }
})
// Add GET endpoint for fetching a single member
app.get('/api/members/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        m.id, m.name, m.email, m.phone, m.role, m.id_number, m.user_id,
        m.next_of_kin_name, m.next_of_kin_phone, m.next_of_kin_email,
        m.next_of_kin_relationship, m.next_of_kin_id_number,
        m.created_at as "joinedAt",
        u.id as "hasUserId"
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Format the data to match your frontend structure
    const member = result.rows[0];
    const formattedMember = {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      idNumber: member.id_number,
      joinedAt: new Date(member.joinedAt).toLocaleDateString(),
      hasUserAccount: !!member.hasUserId,
      userId: member.user_id,
      nextOfKin: {
        name: member.next_of_kin_name,
        phone: member.next_of_kin_phone,
        email: member.next_of_kin_email,
        relationship: member.next_of_kin_relationship,
        idNumber: member.next_of_kin_id_number
      }
    };

    res.json(formattedMember);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ 
      error: 'Failed to fetch member details',
      details: error.message
    });
  }
});

// Add PUT endpoint for updating a member
app.put(
  '/api/members/:id',
  [
    param('id').isInt(),
    body('name').trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').trim().notEmpty(),
    body('role').optional().isString(),
    body('idNumber').optional().isString(),
    body('nextOfKin.name').optional().isString(),
    body('nextOfKin.phone').optional().isString(),
    body('nextOfKin.email').optional().isEmail(),
    body('nextOfKin.relationship').optional().isString(),
    body('nextOfKin.idNumber').optional().isString(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;
    try {
      const { id } = req.params;
      const {
        name,
        email,
        phone,
        role,
        idNumber: id_number,
        nextOfKin: {
          name: nextOfKinName,
          phone: nextOfKinPhone,
          email: nextOfKinEmail,
          relationship: nextOfKinRelationship,
          idNumber: nextOfKinIdNumber,
        } = {},
      } = req.body;

      const result = await pool.query(
        `UPDATE members 
         SET name = $1, email = $2, phone = $3, role = $4, id_number = $5,
             next_of_kin_name = $6, next_of_kin_phone = $7, next_of_kin_email = $8,
             next_of_kin_relationship = $9, next_of_kin_id_number = $10
         WHERE id = $11 RETURNING *`,
        [
          name,
          email,
          phone,
          role,
          id_number,
          nextOfKinName,
          nextOfKinPhone,
          nextOfKinEmail,
          nextOfKinRelationship,
          nextOfKinIdNumber,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating member:', error);
      res.status(500).json({
        error: 'Failed to update member',
        details: error.message,
      });
    }
  }
);

// POST endpoint to convert a member to a user
app.post(
  '/api/members/:id/convert-to-user',
  [
    param('id').isInt(),
    body('username').trim().notEmpty().isLength({ min: 3 }),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least 1 lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least 1 number')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least 1 special character'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { username, password } = req.body;

      // Get member details
      const memberResult = await client.query(
        'SELECT * FROM members WHERE id = $1',
        [id]
      );

      if (memberResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Member not found' });
      }

      const member = memberResult.rows[0];

      // Check if member already has a user account
      if (member.user_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Member already has a user account',
          message: 'This member is already linked to a user account',
        });
      }

      // Check if username or email is already taken
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [member.email, username]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Username or email already exists',
          message: 'A user with this email or username already exists',
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user account
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, username, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING id, email, username, created_at`,
        [member.email, hashedPassword, username]
      );

      const user = userResult.rows[0];

      // Update member with user_id
      await client.query(
        'UPDATE members SET user_id = $1 WHERE id = $2',
        [user.id, id]
      );

      await client.query('COMMIT');

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: member.role || 'member',
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.status(201).json({
        message: 'Member converted to user successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
        },
        member: {
          id: member.id,
          name: member.name,
        },
        credentials: {
          username: user.username,
          // Don't send tokens back - user should login normally
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error converting member to user:', error);
      res.status(500).json({
        error: 'Failed to convert member to user',
        details: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// Start the server - listen only on localhost for nginx reverse proxy
app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Access through nginx reverse proxy only`);
});
