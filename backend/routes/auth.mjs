/**
 * Authentication Routes
 * User registration, login, token refresh, and verification
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken } from '../utils/auth.mjs';
import { authenticateToken } from '../middleware/auth.mjs';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least 1 lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least 1 number')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least 1 special character'),
    body('username').trim().notEmpty().isLength({ min: 3 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;
    const client = await req.app.locals.pool.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email or username already exists',
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (email, password_hash, username)
         VALUES ($1, $2, $3)
         RETURNING id, email, username, created_at`,
        [email, hashedPassword, username]
      );

      const user = result.rows[0];

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: 'member', // Default role
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error.message,
      });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const client = await req.app.locals.pool.connect();

    try {
      // Find user by email
      const result = await client.query(
        `SELECT id, email, password_hash, username, created_at
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Get user's chama memberships
      const chamaResult = await client.query(
        `SELECT cm.chama_id, c.name as chama_name, m.role as member_role
         FROM chama_members cm
         JOIN chamas c ON cm.chama_id = c.id
         JOIN members m ON cm.member_id = m.id
         WHERE m.user_id = $1 AND cm.is_active = true`,
        [user.id]
      );

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: chamaResult.rows.length > 0 ? chamaResult.rows[0].member_role : 'member',
        chamas: chamaResult.rows.map(r => ({
          id: r.chama_id,
          name: r.chama_name,
          role: r.member_role,
        })),
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Update last_login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          chamas: tokenPayload.chamas,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message,
      });
    } finally {
      client.release();
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'Refresh token required',
    });
  }

  try {
    const decoded = verifyToken(refreshToken);
    
    // Generate new access token
    const tokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      chamas: decoded.chamas,
    };

    const newAccessToken = generateToken(tokenPayload);

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(403).json({
      error: 'Invalid refresh token',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify current access token and return user info
 */
router.get('/verify', authenticateToken, async (req, res) => {
  const client = await req.app.locals.pool.connect();

  try {
    const result = await client.query(
      `SELECT id, email, username, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: req.user.role,
        chamas: req.user.chamas,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message,
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side should remove tokens)
 */
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    message: 'Logged out successfully',
  });
});

export default router;
