/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret_change_in_production';

/**
 * Verify JWT Token
 * Extracts and validates the JWT from Authorization header
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. No token provided.',
      code: 'NO_TOKEN'
    });
  }

  // Support both "Bearer token" and just "token" formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. Invalid token format.',
      code: 'INVALID_TOKEN_FORMAT'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Token verification failed.',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
};

/**
 * Require Admin Role
 * Allows only admin and owner roles
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const allowedRoles = ['admin', 'owner'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      error: 'Access denied. Admin privileges required.',
      code: 'ADMIN_REQUIRED',
      yourRole: req.user.role
    });
  }
  
  next();
};

/**
 * Require Owner Role
 * Allows only owner role
 */
const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ 
      success: false,
      error: 'Access denied. Owner privileges required.',
      code: 'OWNER_REQUIRED',
      yourRole: req.user.role
    });
  }
  
  next();
};

/**
 * Require Staff or Higher
 * Allows staff, admin, and owner roles
 */
const requireStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const allowedRoles = ['staff', 'admin', 'owner'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      error: 'Access denied. Staff privileges required.',
      code: 'STAFF_REQUIRED'
    });
  }
  
  next();
};

/**
 * Optional Authentication
 * Continues even if no token is provided, but attaches user if valid token exists
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return next();
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token || token === 'null' || token === 'undefined') {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // Token invalid, but we continue anyway since auth is optional
    req.user = null;
  }
  
  next();
};

module.exports = { 
  verifyToken, 
  requireAdmin, 
  requireOwner, 
  requireStaff,
  optionalAuth 
};