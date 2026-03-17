/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

import { verifyToken, extractToken } from '../utils/auth.mjs';

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token',
      message: error.message,
    });
  }
}

/**
 * Middleware to check if user has specific role
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Optional authentication - attach user if token exists but don't require it
 */
export function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Token invalid but continue anyway
    console.log('Optional auth - invalid token:', error.message);
  }
  
  next();
}
