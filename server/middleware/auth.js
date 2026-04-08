/**
 * ═══════════════════════════════════════════════════════════════
 * Authentication Middleware
 * JWT Verification & Role-Based Access Control (RBAC)
 * Production-Ready Version
 * ═══════════════════════════════════════════════════════════════
 */

const jwt = require('jsonwebtoken');
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret_change_in_production';

// Safe logging function
const logError = (message, error, level = 'warn') => {
  if (NODE_ENV === 'development') {
    console[level](`[AUTH] ${message}`, error?.message || '');
  }
};

/**
 * ────────────────────────────────────────────────────────
 * VERIFY TOKEN MIDDLEWARE
 * Validates JWT and attaches decoded payload to req.user
 * Returns 401 on failure (triggers logout on frontend)
 * ────────────────────────────────────────────────────────
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.',
      code: 'NO_TOKEN',
      type: 'unauthorized'
    });
  }

  // Extract token (handle "Bearer TOKEN" format)
  let token = '';
  const parts = authHeader.split(/\s+/);
  
  if (parts[0]?.toLowerCase() === 'bearer') {
    token = parts.slice(1).join(' ');
  } else {
    token = authHeader;
  }

  token = token?.trim();

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token format.',
      code: 'INVALID_TOKEN_FORMAT',
      type: 'unauthorized'
    });
  }

  try {
    // Verify signature AND expiration
    const decoded = jwt.verify(token, JWT_SECRET, {
      ignoreExpiration: false
    });

    req.user = decoded;
    next();
  } catch (error) {
    logError('Token verification failed', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED',
        type: 'unauthorized'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
        code: 'INVALID_TOKEN',
        type: 'unauthorized'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed.',
      code: 'AUTH_FAILED',
      type: 'unauthorized'
    });
  }
};

/**
 * ────────────────────────────────────────────────────────
 * REQUIRE ADMIN MIDDLEWARE
 * Allows: admin, owner
 * Returns 403 on failure (DO NOT logout)
 * ────────────────────────────────────────────────────────
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      type: 'unauthorized'
    });
  }

  const allowedRoles = ['admin', 'owner'];
  const userRole = String(req.user.role || '').toLowerCase().trim();

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.',
      code: 'ADMIN_REQUIRED',
      yourRole: userRole,
      type: 'forbidden'
    });
  }

  next();
};

/**
 * ────────────────────────────────────────────────────────
 * REQUIRE OWNER MIDDLEWARE
 * Allows: owner only
 * Returns 403 on failure (DO NOT logout)
 * ────────────────────────────────────────────────────────
 */
const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      type: 'unauthorized'
    });
  }

  const userRole = String(req.user.role || '').toLowerCase().trim();

  if (userRole !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Owner privileges required.',
      code: 'OWNER_REQUIRED',
      yourRole: userRole,
      type: 'forbidden'
    });
  }

  next();
};

/**
 * ────────────────────────────────────────────────────────
 * REQUIRE STAFF MIDDLEWARE
 * Allows: staff, admin, owner
 * ────────────────────────────────────────────────────────
 */
const requireStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      type: 'unauthorized'
    });
  }

  const allowedRoles = ['staff', 'admin', 'owner'];
  const userRole = String(req.user.role || '').toLowerCase().trim();

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied.',
      code: 'STAFF_REQUIRED',
      type: 'forbidden'
    });
  }

  next();
};

/**
 * ────────────────────────────────────────────────────────
 * OPTIONAL AUTH MIDDLEWARE
 * Attempts to attach user if token exists
 * Continues even if no token or invalid token
 * ────────────────────────────────────────────────────────
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(/\s+/);
  let token = parts[0]?.toLowerCase() === 'bearer' 
    ? parts.slice(1).join(' ')
    : authHeader;

  token = token?.trim();

  if (!token || token === 'null' || token === 'undefined') {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: false });
    req.user = decoded;
  } catch (error) {
    req.user = null;
    logError('Optional auth failed', error, 'debug');
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