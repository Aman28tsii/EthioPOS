/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EthioPOS Backend Server
 * Version: 3.0.0 (PostgreSQL + Production Ready)
 * Complete API with Authentication, Products, Sales, Staff, and Analytics
 * 
 * MIGRATION NOTES:
 * - SQLite → PostgreSQL (Neon.tech)
 * - ? placeholders → $1, $2, $3
 * - this.lastID → RETURNING id
 * - this.changes → result.rowCount
 * - date('now','localtime') → CURRENT_DATE
 * - strftime('%H', col) → EXTRACT(HOUR FROM col)
 * - LIKE → ILIKE (case insensitive)
 * - MAX(0, x) → GREATEST(0, x)
 * - db.serialize + BEGIN → client transaction
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();

// Validate environment variables before starting
const validateEnv = require('./config/validateEnv');
validateEnv();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ CHANGED: db is now a pg Pool instead of sqlite3 Database
const pool = require('./config/db');
const { verifyToken, requireAdmin, requireOwner, requireStaff, optionalAuth } = require('./middleware/auth');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret_' + Date.now();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ═══════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (NODE_ENV === 'development') {
      // In development, allow all origins with a warning
      console.warn(`⚠️ CORS: Allowing request from unlisted origin: ${origin}`);
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit']
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { 
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/api/status';
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: { 
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many signup attempts. Please try again later.',
    code: 'SIGNUP_RATE_LIMIT_EXCEEDED'
  }
});

// Apply general rate limiter
app.use('/api/', generalLimiter);

// ═══════════════════════════════════════════════════════════════
// BODY PARSING & LOGGING
// ═══════════════════════════════════════════════════════════════

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Custom request logging with timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  
  // Log request details in development
  if (NODE_ENV === 'development') {
    console.log(`📨 ${req.requestTime} | ${req.method} ${req.path} | IP: ${req.ip}`);
  }
  
  next();
});

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK & STATUS ROUTES (Public)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/health
 * Comprehensive health check with database status
 */
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // ✅ CHANGED: pool.query instead of db.get
    await pool.query("SELECT 1 as check");
    const dbResponseTime = Date.now() - startTime;

    res.json({
      status: 'healthy',
      version: '3.0.0',
      environment: NODE_ENV,
      database: {
        status: 'connected',
        type: 'PostgreSQL (Neon.tech)',
        responseTime: `${dbResponseTime}ms`
      },
      server: {
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      version: '3.0.0',
      database: {
        status: 'disconnected',
        error: err.message
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/status
 * Simple status check (backward compatible)
 */
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '3.0.0',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * ✅ Fixed: shows correct message for pending/inactive accounts
 */
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // ✅ CHANGED: pool.query with $1 instead of db.get with ?
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // ✅ Status check (this is the main improvement)
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        error: 'Account pending owner approval'
      });
    }

    if (user.status === 'inactive' || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Contact owner.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Log successful login (fire and forget)
    // ✅ CHANGED: pool.query with $1, $2, $3
    pool.query(
      "INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
      [user.id, 'LOGIN', 'Successful login', req.ip]
    ).catch(err => console.error('Log error:', err));

    // ✅ Return success response (include status too)
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
});

/**
 * POST /api/auth/signup
 * Register a new user
 * - First user automatically becomes owner
 * - Subsequent signups require invite code or are staff only
 */
app.post('/api/auth/signup', signupLimiter, async (req, res) => {
  const { name, email, password, role, inviteCode } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Name, email, and password are required' 
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ 
      success: false,
      error: 'Name must be at least 2 characters' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'Password must be at least 6 characters' 
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid email format' 
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  try {
    // Check if any users exist (for first user logic)
    // ✅ CHANGED: pool.query with await
    const countResult = await pool.query("SELECT COUNT(*) as count FROM users");
    const isFirstUser = parseInt(countResult.rows[0].count) === 0;
    let assignedRole = 'staff';

    if (isFirstUser) {
      // First user becomes owner automatically
      assignedRole = 'owner';
      console.log('🎉 Creating first user as owner');
    } else {
      // Check invite code for elevated roles
      const requestedRole = (role || 'staff').toLowerCase();
      
      if (requestedRole === 'owner') {
        return res.status(403).json({ 
          success: false,
          error: 'Owner account already exists' 
        });
      }

      if (requestedRole === 'admin') {
        // Require invite code for admin
        const validInviteCode = process.env.SIGNUP_INVITE_CODE;
        if (!validInviteCode || inviteCode !== validInviteCode) {
          return res.status(403).json({ 
            success: false,
            error: 'Valid invite code required for admin registration' 
          });
        }
        assignedRole = 'admin';
      }
    }

    // Validate final role
    if (!['owner', 'admin', 'staff'].includes(assignedRole)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    // ✅ CHANGED: RETURNING id instead of this.lastID
    const insertResult = await pool.query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id",
      [trimmedName, normalizedEmail, hashedPassword, assignedRole]
    );

    const newId = insertResult.rows[0].id;

    // Log account creation (fire and forget)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)",
      [newId, 'SIGNUP', `Account created with role: ${assignedRole}`, req.ip]
    ).catch(err => console.error('Log error:', err));

    res.status(201).json({ 
      success: true,
      message: 'Account created successfully', 
      user: { 
        id: newId, 
        name: trimmedName, 
        email: normalizedEmail, 
        role: assignedRole 
      }
    });

  } catch (error) {
    // ✅ CHANGED: PostgreSQL error code for unique violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: 'Email already registered' 
      });
    }
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during signup' 
    });
  }
});

/**
 * ✅ GET /api/auth/verify
 * 🎯 CRITICAL ENDPOINT FOR FRONTEND TOKEN VALIDATION
 * Frontend calls this on app initialization to validate token
 * Prevents "redirect loop" issue by checking token validity before rendering protected pages
 */
app.get('/api/auth/verify', verifyToken, async (req, res) => {
  try {
    // ✅ CHANGED: pool.query
    const result = await pool.query(
      "SELECT id, name, email, role, status FROM users WHERE id = $1 AND status = 'active'",
      [req.user.id]
    );
    const user = result.rows[0];

    // User not found or deactivated
    if (!user) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'User account not found or deactivated'
      });
    }

    // Token is valid and user is active
    res.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Verify token - DB error:", err);
    return res.status(500).json({
      success: false,
      valid: false,
      error: 'Database error during verification'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user's information
 */
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    // ✅ CHANGED: pool.query
    const result = await pool.query(
      "SELECT id, name, email, role, status, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ 
      success: false,
      error: 'Database error' 
    });
  }
});

/**
 * PUT /api/auth/change-password
 * Change current user's password
 */
app.put('/api/auth/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false,
      error: 'Current password and new password are required' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'New password must be at least 6 characters' 
    });
  }

  try {
    // ✅ CHANGED: pool.query
    const result = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(500).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ✅ CHANGED: pool.query
    await pool.query(
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, req.user.id]
    );

    // Log password change (fire and forget)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, ip_address) VALUES ($1, $2, $3)",
      [req.user.id, 'PASSWORD_CHANGE', req.ip]
    ).catch(err => console.error('Log error:', err));

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to update password' 
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, server-side logging)
 */
app.post('/api/auth/logout', verifyToken, (req, res) => {
  // Log logout (fire and forget)
  // ✅ CHANGED: pool.query
  pool.query(
    "INSERT INTO activity_logs (user_id, action, ip_address) VALUES ($1, $2, $3)",
    [req.user.id, 'LOGOUT', req.ip]
  ).catch(err => console.error('Log error:', err));

  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

// ═══════════════════════════════════════════════════════════════
// PRODUCTS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/products
 * Get all products with optional filtering
 */
app.get('/api/products', verifyToken, async (req, res) => {
  const { category, search, inStock, page, limit } = req.query;
  
  // ✅ CHANGED: Build parameterized query for PostgreSQL
  let sql = "SELECT * FROM products WHERE is_active = 1";
  const params = [];
  let paramIndex = 0;

  // Category filter
  if (category && category !== 'all') {
    paramIndex++;
    sql += ` AND category = $${paramIndex}`;
    params.push(category);
  }

  // Search filter
  // ✅ CHANGED: ILIKE instead of LIKE for case-insensitive search
  if (search) {
    paramIndex++;
    sql += ` AND (name ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
    sql += ` OR barcode ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
  }

  // Stock filter
  if (inStock === 'true') {
    sql += " AND stock > 0";
  }

  sql += " ORDER BY name ASC";

  // Pagination
  if (limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    paramIndex++;
    sql += ` LIMIT $${paramIndex}`;
    params.push(limitNum);
    paramIndex++;
    sql += ` OFFSET $${paramIndex}`;
    params.push(offset);
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows || []);
  } catch (err) {
    console.error("Get products error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/products/categories
 * Get all product categories
 */
app.get('/api/products/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category ASC"
    );
    const categories = result.rows.map(r => r.category);
    res.json(categories);
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
app.get('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // ✅ CHANGED: $1
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
    const product = result.rows[0];

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }
    res.json(product);
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * POST /api/products
 * Add new product (Admin/Owner only)
 */
app.post('/api/products', verifyToken, requireAdmin, async (req, res) => {
  const { name, price, stock, category, barcode, description, image_url } = req.body;

  // Validation
  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Product name is required' 
    });
  }

  if (price === undefined || price === null || isNaN(Number(price))) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid price is required' 
    });
  }

  if (Number(price) < 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Price cannot be negative' 
    });
  }

  const productData = {
    name: name.trim(),
    price: Number(price),
    stock: Math.max(0, Number(stock) || 0),
    category: (category || 'General').trim(),
    barcode: barcode ? barcode.trim() : null,
    description: description ? description.trim() : null,
    image_url: image_url ? image_url.trim() : null
  };

  try {
    // ✅ CHANGED: $1-$7 and RETURNING id
    const result = await pool.query(
      `INSERT INTO products (name, price, stock, category, barcode, description, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [productData.name, productData.price, productData.stock, productData.category, 
       productData.barcode, productData.description, productData.image_url]
    );

    const newId = result.rows[0].id;
      
    // Log activity (fire and forget)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
      [req.user.id, 'CREATE', 'product', newId, `Created product: ${productData.name}`]
    ).catch(err => console.error('Log error:', err));
      
    res.status(201).json({ 
      success: true,
      message: 'Product created successfully',
      id: newId,
      ...productData,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    // ✅ CHANGED: PostgreSQL unique violation code
    if (err.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: 'Product with this barcode already exists' 
      });
    }
    console.error("Add product error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * PUT /api/products/:id
 * Update existing product (Admin/Owner only)
 */
app.put('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, stock, category, barcode, description, image_url, is_active } = req.body;

  // Validation
  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Product name is required' 
    });
  }

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid price is required' 
    });
  }

  const productData = {
    name: name.trim(),
    price: Number(price),
    stock: Math.max(0, Number(stock) || 0),
    category: (category || 'General').trim(),
    barcode: barcode ? barcode.trim() : null,
    description: description ? description.trim() : null,
    image_url: image_url ? image_url.trim() : null,
    is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1
  };

  try {
    // ✅ CHANGED: $1-$9
    const result = await pool.query(
      `UPDATE products SET 
        name = $1, price = $2, stock = $3, category = $4, 
        barcode = $5, description = $6, image_url = $7, is_active = $8,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9`,
      [productData.name, productData.price, productData.stock, productData.category,
       productData.barcode, productData.description, productData.image_url, productData.is_active, id]
    );

    // ✅ CHANGED: result.rowCount instead of this.changes
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found' 
      });
    }

    // Log activity (fire and forget)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
      [req.user.id, 'UPDATE', 'product', id, `Updated product: ${productData.name}`]
    ).catch(err => console.error('Log error:', err));

    res.json({ 
      success: true,
      message: 'Product updated successfully',
      id: Number(id)
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: 'Product with this barcode already exists' 
      });
    }
    console.error("Update product error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * PATCH /api/products/:id/stock
 * Update product stock only
 */
app.patch('/api/products/:id/stock', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { stock, adjustment } = req.body;

  try {
    if (stock !== undefined) {
      // Set absolute stock value
      // ✅ CHANGED: $1, $2
      const result = await pool.query(
        "UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [Math.max(0, Number(stock)), id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      res.json({ success: true, message: 'Stock updated' });
    } else if (adjustment !== undefined) {
      // Adjust stock by value
      // ✅ CHANGED: GREATEST instead of MAX
      const result = await pool.query(
        "UPDATE products SET stock = GREATEST(0, stock + $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [Number(adjustment), id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      res.json({ success: true, message: 'Stock adjusted' });
    } else {
      res.status(400).json({ success: false, error: 'Stock or adjustment value required' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Delete product (Admin/Owner only)
 * Soft delete by setting is_active = 0
 */
app.delete('/api/products/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;
  
  try {
    if (permanent === 'true' && req.user.role === 'owner') {
      // Permanent delete (owner only)
      const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }

      pool.query(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
        [req.user.id, 'DELETE_PERMANENT', 'product', id, `Permanently deleted product ID: ${id}`]
      ).catch(err => console.error('Log error:', err));

      res.json({ 
        success: true,
        message: 'Product permanently deleted' 
      });
    } else {
      // Soft delete
      const result = await pool.query(
        "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }

      pool.query(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
        [req.user.id, 'DELETE', 'product', id, `Soft deleted product ID: ${id}`]
      ).catch(err => console.error('Log error:', err));

      res.json({ 
        success: true,
        message: 'Product deleted successfully' 
      });
    }
  } catch (err) {
    console.error("Delete product error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// SALES ROUTES (With PostgreSQL Transaction Support)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/sales
 * Record a new sale transaction with proper transaction handling
 */
app.post('/api/sales', verifyToken, async (req, res) => {
  const { total_amount, items_count, items, payment_method, customer_name, customer_phone, notes } = req.body;
  const staff_id = req.user.id;

  // Validation
  if (!total_amount || total_amount <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Valid total amount is required' 
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'At least one item is required' 
    });
  }

  // Validate each item
  for (const item of items) {
    if (!item.product_id || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid item data: Each item needs product_id and positive quantity' 
      });
    }
    if (item.price === undefined || item.price < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid item data: Each item needs a valid price' 
      });
    }
  }

  // Calculate items_count if not provided
  const itemCount = items_count || items.reduce((sum, item) => sum + item.quantity, 0);
  const paymentMethodValue = payment_method || 'cash';

  // ✅ CHANGED: PostgreSQL transaction using client from pool
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate stock for all items first
    for (const item of items) {
      const stockCheck = await client.query(
        "SELECT id, name, stock FROM products WHERE id = $1 AND is_active = 1",
        [item.product_id]
      );

      if (stockCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          error: `Product ${item.product_id} not found` 
        });
      }

      const product = stockCheck.rows[0];
      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          details: {
            product_id: item.product_id,
            available: product.stock,
            requested: item.quantity
          }
        });
      }
    }

    // Create order
    // ✅ CHANGED: RETURNING id
    const orderResult = await client.query(
      `INSERT INTO orders (total_amount, items_count, staff_id, status, payment_method, customer_name, customer_phone, notes) 
       VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7) RETURNING id`,
      [total_amount, itemCount, staff_id, paymentMethodValue, customer_name || null, customer_phone || null, notes || null]
    );

    const orderId = orderResult.rows[0].id;

    // Process each item
    for (const item of items) {
      // Update stock
      await client.query(
        "UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [item.quantity, item.product_id]
      );

      // Insert order item
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)",
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');

    // Log the sale (fire and forget - outside transaction)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
      [staff_id, 'SALE', 'order', orderId, `Sale completed: Br ${total_amount}`]
    ).catch(err => console.error('Log error:', err));

    // Success response
    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      orderId,
      receiptNumber: `ETH-${orderId.toString().padStart(6, '0')}`,
      total: total_amount,
      itemsCount: itemCount,
      paymentMethod: paymentMethodValue,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Sale transaction error:", err);
    return res.status(500).json({ 
      success: false,
      error: 'Sale transaction failed: ' + err.message 
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/sales/history
 * Get sales history with optional date range filter
 */
app.get('/api/sales/history', verifyToken, async (req, res) => {
  const { range, limit, page, staff_id, status } = req.query;

  // ✅ CHANGED: PostgreSQL date functions
  let dateFilter = "1=1";
  
  switch(range) {
    case 'today':
      dateFilter = "DATE(o.created_at) = CURRENT_DATE";
      break;
    case 'yesterday':
      dateFilter = "DATE(o.created_at) = CURRENT_DATE - INTERVAL '1 day'";
      break;
    case 'week':
      dateFilter = "o.created_at >= NOW() - INTERVAL '7 days'";
      break;
    case 'month':
      dateFilter = "o.created_at >= NOW() - INTERVAL '30 days'";
      break;
    case 'year':
      dateFilter = "o.created_at >= NOW() - INTERVAL '365 days'";
      break;
    case 'all':
    default:
      dateFilter = "1=1";
      break;
  }

  // ✅ CHANGED: Dynamic parameterized query
  let additionalFilters = "";
  const params = [];
  let paramIndex = 0;

  if (staff_id) {
    paramIndex++;
    additionalFilters += ` AND o.staff_id = $${paramIndex}`;
    params.push(staff_id);
  }

  if (status) {
    paramIndex++;
    additionalFilters += ` AND o.status = $${paramIndex}`;
    params.push(status);
  }

  const recordLimit = Math.min(Number(limit) || 100, 500);
  const pageNum = Number(page) || 1;
  const offset = (pageNum - 1) * recordLimit;

  try {
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM orders o WHERE ${dateFilter}${additionalFilters}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get paginated results
    paramIndex++;
    const limitParamNum = paramIndex;
    paramIndex++;
    const offsetParamNum = paramIndex;

    const dataResult = await pool.query(
      `SELECT o.*, u.name as staff_name 
       FROM orders o 
       LEFT JOIN users u ON o.staff_id = u.id 
       WHERE ${dateFilter}${additionalFilters}
       ORDER BY o.created_at DESC 
       LIMIT $${limitParamNum} OFFSET $${offsetParamNum}`,
      [...params, recordLimit, offset]
    );

    // Add receipt numbers
    const salesWithReceipts = (dataResult.rows || []).map(sale => ({
      ...sale,
      receiptNumber: `ETH-${sale.id.toString().padStart(6, '0')}`
    }));

    res.json({
      success: true,
      data: salesWithReceipts,
      pagination: {
        page: pageNum,
        limit: recordLimit,
        total,
        totalPages: Math.ceil(total / recordLimit)
      }
    });
  } catch (err) {
    console.error("Sales history error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/sales/:id
 * Get single sale with items
 */
app.get('/api/sales/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // ✅ CHANGED: $1
    const orderResult = await pool.query(
      `SELECT o.*, u.name as staff_name 
       FROM orders o 
       LEFT JOIN users u ON o.staff_id = u.id 
       WHERE o.id = $1`,
      [id]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name, p.category 
       FROM order_items oi 
       LEFT JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = $1`,
      [id]
    );
    
    res.json({
      success: true,
      order: {
        ...order,
        receiptNumber: `ETH-${order.id.toString().padStart(6, '0')}`,
        items: itemsResult.rows || []
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * PUT /api/sales/:id/status
 * Update sale status (for refunds/cancellations)
 */
app.put('/api/sales/:id/status', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['pending', 'completed', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }

  try {
    // Get current order
    const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // If refunding or cancelling, restore stock
    if ((status === 'refunded' || status === 'cancelled') && order.status === 'completed') {
      // ✅ CHANGED: PostgreSQL transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get order items
        const itemsResult = await client.query(
          "SELECT * FROM order_items WHERE order_id = $1",
          [id]
        );

        // Restore stock for each item
        for (const item of itemsResult.rows) {
          await client.query(
            "UPDATE products SET stock = stock + $1 WHERE id = $2",
            [item.quantity, item.product_id]
          );
        }

        // Update order status
        await client.query(
          "UPDATE orders SET status = $1, notes = COALESCE(notes || ' | ', '') || $2 WHERE id = $3",
          [status, `${status.toUpperCase()}: ${reason || 'No reason provided'}`, id]
        );

        await client.query('COMMIT');

        // Log activity (fire and forget)
        pool.query(
          "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
          [req.user.id, status.toUpperCase(), 'order', id, reason || 'Status updated']
        ).catch(err => console.error('Log error:', err));

        res.json({ 
          success: true,
          message: `Order ${status} successfully` 
        });
      } catch (txErr) {
        await client.query('ROLLBACK');
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update order' 
        });
      } finally {
        client.release();
      }
    } else {
      // Simple status update without stock adjustment
      await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2",
        [status, id]
      );

      res.json({ 
        success: true,
        message: `Order status updated to ${status}` 
      });
    }
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// STAFF ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/staff
 * Get all staff members
 */
app.get('/api/staff', verifyToken, async (req, res) => {
  const { status, role } = req.query;
  
  // ✅ CHANGED: Dynamic parameterized query
  let sql = "SELECT id, name, email, role, status, created_at FROM users WHERE 1=1";
  const params = [];
  let paramIndex = 0;

  if (status) {
    paramIndex++;
    sql += ` AND status = $${paramIndex}`;
    params.push(status);
  }

  if (role) {
    paramIndex++;
    sql += ` AND role = $${paramIndex}`;
    params.push(role);
  }

  sql += " ORDER BY name ASC";

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows || []);
  } catch (err) {
    console.error("Get staff error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/staff/:id
 * Get single staff member with stats
 */
app.get('/api/staff/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const userResult = await pool.query(
      "SELECT id, name, email, role, status, created_at FROM users WHERE id = $1",
      [id]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Staff member not found' 
      });
    }

    // Get staff stats
    // ✅ CHANGED: CURRENT_DATE instead of date('now', 'localtime')
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_sales
       FROM orders 
       WHERE staff_id = $1 AND status = 'completed'`,
      [id]
    );

    res.json({
      success: true,
      staff: {
        ...user,
        stats: statsResult.rows[0] || { total_sales: 0, total_revenue: 0, today_sales: 0 }
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * POST /api/staff
 * Add new staff member (Admin/Owner only)
 */
app.post('/api/staff', verifyToken, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || name.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Name is required' 
    });
  }

  if (!email || email.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: 'Email is required' 
    });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'Password must be at least 6 characters' 
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid email format' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Normalize role to lowercase
    const normalizedRole = (role || 'staff').toLowerCase();
    
    // Validate role
    if (!['owner', 'admin', 'staff'].includes(normalizedRole)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid role. Must be owner, admin, or staff' 
      });
    }

    // Prevent non-owners from creating owner accounts
    if (normalizedRole === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ 
        success: false,
        error: 'Only owners can create owner accounts' 
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // ✅ CHANGED: RETURNING id
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id",
      [trimmedName, normalizedEmail, hashedPassword, normalizedRole]
    );

    const newId = result.rows[0].id;

    // Log activity (fire and forget)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
      [req.user.id, 'CREATE', 'user', newId, `Created staff: ${trimmedName} (${normalizedRole})`]
    ).catch(err => console.error('Log error:', err));
    
    res.status(201).json({ 
      success: true,
      message: 'Staff member created successfully',
      staff: {
        id: newId,
        name: trimmedName,
        email: normalizedEmail,
        role: normalizedRole,
        status: 'active',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    // ✅ CHANGED: PostgreSQL unique violation
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }
    console.error("Staff creation error:", error);
    res.status(500).json({ 
      success: false,
      error: 'Server error during staff creation' 
    });
  }
});

/**
 * PUT /api/staff/:id
 * Update staff member (Admin/Owner only)
 */
app.put('/api/staff/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, password } = req.body;

  // Prevent self-modification of role
  if (parseInt(id) === req.user.id && role && role.toLowerCase() !== req.user.role) {
    return res.status(403).json({ 
      success: false,
      error: 'Cannot modify your own role' 
    });
  }

  // Normalize role if provided
  const normalizedRole = role ? role.toLowerCase() : undefined;

  // Validate role if provided
  if (normalizedRole && !['owner', 'admin', 'staff'].includes(normalizedRole)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid role' 
    });
  }

  // Prevent non-owners from assigning owner role
  if (normalizedRole === 'owner' && req.user.role !== 'owner') {
    return res.status(403).json({ 
      success: false,
      error: 'Only owners can assign owner role' 
    });
  }

  // ✅ CHANGED: Build parameterized update query for PostgreSQL
  const updates = [];
  const values = [];
  let paramIndex = 0;

  if (name) {
    paramIndex++;
    updates.push(`name = $${paramIndex}`);
    values.push(name.trim());
  }
  if (email) {
    paramIndex++;
    updates.push(`email = $${paramIndex}`);
    values.push(email.toLowerCase().trim());
  }
  if (normalizedRole) {
    paramIndex++;
    updates.push(`role = $${paramIndex}`);
    values.push(normalizedRole);
  }
  if (status) {
    paramIndex++;
    updates.push(`status = $${paramIndex}`);
    values.push(status);
  }
  if (password && password.length >= 6) {
    const hashedPassword = await bcrypt.hash(password, 12);
    paramIndex++;
    updates.push(`password = $${paramIndex}`);
    values.push(hashedPassword);
  }

  if (updates.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'No valid fields to update' 
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  paramIndex++;
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Staff member not found' 
      });
    }

    // Log activity (fire and forget)
    pool.query(
      "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
      [req.user.id, 'UPDATE', 'user', id, `Updated staff ID: ${id}`]
    ).catch(err => console.error('Log error:', err));

    res.json({ 
      success: true,
      message: 'Staff member updated successfully' 
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }
    console.error("Update staff error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * DELETE /api/staff/:id
 * Delete staff member (Owner only)
 */
app.delete('/api/staff/:id', verifyToken, requireOwner, async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Prevent self-deletion
  if (parseInt(id) === req.user.id) {
    return res.status(403).json({ 
      success: false,
      error: 'Cannot delete your own account' 
    });
  }

  try {
    if (permanent === 'true') {
      // Check if user has orders
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM orders WHERE staff_id = $1",
        [id]
      );

      if (parseInt(countResult.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot permanently delete. User has ${countResult.rows[0].count} orders. Deactivate instead.`
        });
      }

      const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Staff member not found' });
      }

      pool.query(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
        [req.user.id, 'DELETE_PERMANENT', 'user', id, `Permanently deleted user ID: ${id}`]
      ).catch(err => console.error('Log error:', err));

      res.json({ success: true, message: 'Staff member permanently deleted' });
    } else {
      // Soft delete (deactivate)
      const result = await pool.query(
        "UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Staff member not found' 
        });
      }

      pool.query(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
        [req.user.id, 'DEACTIVATE', 'user', id, `Deactivated user ID: ${id}`]
      ).catch(err => console.error('Log error:', err));

      res.json({ 
        success: true,
        message: 'Staff member deactivated successfully' 
      });
    }
  } catch (err) {
    console.error("Delete staff error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// COMMENTS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/comments
 * Get all comments
 */
app.get('/api/comments', verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM comments ORDER BY created_at DESC");
    res.json({ success: true, data: result.rows || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/comments
 * Add new comment
 */
app.post('/api/comments', verifyToken, async (req, res) => {
  const { customer_name, message, type, rating, status } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // ✅ CHANGED: RETURNING id
    const result = await pool.query(
      `INSERT INTO comments 
       (customer_name, message, type, rating, status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        customer_name || 'Anonymous',
        message.trim(),
        type || 'feedback',
        rating || 5,
        status || 'pending',
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      comment: {
        id: result.rows[0].id,
        customer_name: customer_name || 'Anonymous',
        message: message.trim(),
        type: type || 'feedback',
        rating: rating || 5,
        status: status || 'pending',
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/comments/:id
 * Update comment status
 */
app.put('/api/comments/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      "UPDATE comments SET status = $1 WHERE id = $2",
      [status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/comments/:id
 * Delete comment
 */
app.delete('/api/comments/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM comments WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard statistics
 */
app.get('/api/analytics/dashboard', verifyToken, async (req, res) => {
  try {
    // ✅ CHANGED: All date functions to PostgreSQL equivalents
    // Run all queries in parallel for speed
    const [todayRes, yesterdayRes, weekRes, monthRes, staffRes, productRes] = await Promise.all([
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders,
          COALESCE(AVG(total_amount), 0) as avg_order
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE 
        AND status = 'completed'
      `),
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
        AND status = 'completed'
      `),
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        AND status = 'completed'
      `),
      pool.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status = 'completed'
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active
        FROM users
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock,
          COUNT(CASE WHEN stock <= 10 AND stock > 0 THEN 1 END) as low_stock,
          COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock
        FROM products 
        WHERE is_active = 1
      `)
    ]);

    // Calculate changes
    const todayRev = parseFloat(todayRes.rows[0]?.revenue) || 0;
    const yestRev = parseFloat(yesterdayRes.rows[0]?.revenue) || 0;
    const todayOrders = parseInt(todayRes.rows[0]?.orders) || 0;
    const yestOrders = parseInt(yesterdayRes.rows[0]?.orders) || 0;

    let revChange = 0;
    if (yestRev === 0 && todayRev > 0) revChange = 100;
    else if (yestRev > 0) revChange = ((todayRev - yestRev) / yestRev) * 100;

    let orderChange = 0;
    if (yestOrders === 0 && todayOrders > 0) orderChange = 100;
    else if (yestOrders > 0) orderChange = ((todayOrders - yestOrders) / yestOrders) * 100;

    res.json({
      success: true,
      data: {
        today: {
          revenue: todayRev,
          orders: todayOrders,
          averageOrder: parseFloat(todayRes.rows[0]?.avg_order) || 0,
          revenueChange: revChange,
          ordersChange: orderChange
        },
        week: weekRes.rows[0],
        month: monthRes.rows[0],
        staff: staffRes.rows[0],
        products: productRes.rows[0]
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/daily-stats
 * Get daily business statistics (backward compatible format)
 */
app.get('/api/analytics/daily-stats', verifyToken, async (req, res) => {
  try {
    // ✅ CHANGED: All SQLite date functions → PostgreSQL
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total_amount ELSE 0 END), 0) as today_rev,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND status = 'completed' THEN id END) as today_orders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' THEN total_amount ELSE 0 END), 0) as yesterday_rev,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' AND status = 'completed' THEN id END) as yesterday_orders,
        (SELECT COUNT(*) FROM users WHERE status = 'active') as active_staff,
        (SELECT COUNT(*) FROM products WHERE stock > 0 AND is_active = 1) as products_in_stock
      FROM orders
      WHERE status = 'completed'
    `);

    const row = result.rows[0];
    const todayRev = parseFloat(row?.today_rev) || 0;
    const yestRev = parseFloat(row?.yesterday_rev) || 0;
    const todayOrders = parseInt(row?.today_orders) || 0;
    const yesterdayOrders = parseInt(row?.yesterday_orders) || 0;

    // Calculate percentage changes
    let revChange = 0;
    if (yestRev === 0 && todayRev > 0) {
      revChange = 100;
    } else if (yestRev > 0) {
      revChange = ((todayRev - yestRev) / yestRev) * 100;
    }

    let orderChange = 0;
    if (yesterdayOrders === 0 && todayOrders > 0) {
      orderChange = 100;
    } else if (yesterdayOrders > 0) {
      orderChange = ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100;
    }

    const avgSpend = todayOrders > 0 ? (todayRev / todayOrders) : 0;

    // Return in the format expected by frontend
    res.json([
      { 
        title: 'Daily Revenue', 
        value: `Br ${todayRev.toLocaleString()}`, 
        change: `${revChange >= 0 ? '+' : ''}${revChange.toFixed(1)}%`, 
        upbeat: revChange >= 0 
      },
      { 
        title: 'Total Orders', 
        value: todayOrders.toString(), 
        change: `${orderChange >= 0 ? '+' : ''}${orderChange.toFixed(1)}%`, 
        upbeat: orderChange >= 0 
      },
      { 
        title: 'Active Staff', 
        value: (parseInt(row?.active_staff) || 0).toString(), 
        change: 'Online', 
        upbeat: true 
      },
      { 
        title: 'Avg. Spend', 
        value: `Br ${avgSpend.toFixed(2)}`, 
        change: 'Per Order', 
        upbeat: true 
      },
    ]);
  } catch (err) {
    console.error("Daily stats error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/analytics/top-products
 * Get top selling products
 */
app.get('/api/analytics/top-products', verifyToken, async (req, res) => {
  const { limit, range } = req.query;
  const productLimit = Math.min(Number(limit) || 5, 20);

  // ✅ CHANGED: PostgreSQL date functions
  let dateFilter = "DATE(o.created_at) = CURRENT_DATE";
  
  switch(range) {
    case 'yesterday':
      dateFilter = "DATE(o.created_at) = CURRENT_DATE - INTERVAL '1 day'";
      break;
    case 'week':
      dateFilter = "o.created_at >= NOW() - INTERVAL '7 days'";
      break;
    case 'month':
      dateFilter = "o.created_at >= NOW() - INTERVAL '30 days'";
      break;
    case 'year':
      dateFilter = "o.created_at >= NOW() - INTERVAL '365 days'";
      break;
    case 'all':
      dateFilter = "1=1";
      break;
  }

  try {
    // ✅ CHANGED: GROUP BY must include all non-aggregated columns in PostgreSQL
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        COALESCE(SUM(oi.quantity), 0) as sales, 
        COALESCE(SUM(oi.quantity * oi.price_at_time), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${dateFilter} AND o.status = 'completed'
      GROUP BY p.id, p.name, p.category
      ORDER BY sales DESC
      LIMIT $1
    `, [productLimit]);
    
    res.json((result.rows || []).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      sales: parseInt(row.sales),
      revenue: `Br ${parseFloat(row.revenue || 0).toLocaleString()}`
    })));
  } catch (err) {
    console.error("Top products error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/analytics/revenue-trend
 * Get revenue trend for specified period
 */
app.get('/api/analytics/revenue-trend', verifyToken, async (req, res) => {
  const { days } = req.query;
  const numDays = Math.min(Number(days) || 7, 365);

  try {
    // ✅ CHANGED: PostgreSQL interval syntax
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders,
        COALESCE(AVG(total_amount), 0) as average
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${numDays} days'
      AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: result.rows || [],
      period: `${numDays} days`
    });
  } catch (err) {
    console.error("Revenue trend error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/analytics/hourly-sales
 * Get sales by hour for today
 */
app.get('/api/analytics/hourly-sales', verifyToken, async (req, res) => {
  try {
    // ✅ CHANGED: EXTRACT(HOUR FROM ...) instead of strftime('%H', ...)
    const result = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at)::INT as hour,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
      AND status = 'completed'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `);

    const hoursMap = {};
    (result.rows || []).forEach(r => {
      hoursMap[r.hour] = {
        hour: r.hour,
        orders: parseInt(r.orders),
        revenue: parseFloat(r.revenue)
      };
    });

    const fullData = [];
    for (let h = 0; h < 24; h++) {
      fullData.push(hoursMap[h] || { hour: h, orders: 0, revenue: 0 });
    }

    res.json({
      success: true,
      data: fullData
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/low-stock
 * Get products with low stock
 */
app.get('/api/analytics/low-stock', verifyToken, async (req, res) => {
  const threshold = Number(req.query.threshold) || 10;

  try {
    const result = await pool.query(
      `SELECT id, name, price, stock, category 
       FROM products 
       WHERE stock <= $1 AND is_active = 1 
       ORDER BY stock ASC`,
      [threshold]
    );
    res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * GET /api/analytics/staff-performance
 * Get staff performance metrics
 */
app.get('/api/analytics/staff-performance', verifyToken, requireAdmin, async (req, res) => {
  const { range } = req.query;
  
  // ✅ CHANGED: PostgreSQL date functions
  let dateFilter = "DATE(o.created_at) = CURRENT_DATE";
  
  switch(range) {
    case 'week':
      dateFilter = "o.created_at >= NOW() - INTERVAL '7 days'";
      break;
    case 'month':
      dateFilter = "o.created_at >= NOW() - INTERVAL '30 days'";
      break;
    case 'all':
      dateFilter = "1=1";
      break;
  }

  try {
    // ✅ CHANGED: GROUP BY must include all non-aggregated columns
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as average_order,
        MAX(o.created_at) as last_sale
      FROM users u
      LEFT JOIN orders o ON u.id = o.staff_id AND o.status = 'completed' AND ${dateFilter}
      WHERE u.status = 'active'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_revenue DESC
    `);

    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/category-breakdown
 * Get sales breakdown by category
 */
app.get('/api/analytics/category-breakdown', verifyToken, async (req, res) => {
  const { range } = req.query;
  
  // ✅ CHANGED: PostgreSQL date functions
  let dateFilter = "DATE(o.created_at) = CURRENT_DATE";
  
  switch(range) {
    case 'week':
      dateFilter = "o.created_at >= NOW() - INTERVAL '7 days'";
      break;
    case 'month':
      dateFilter = "o.created_at >= NOW() - INTERVAL '30 days'";
      break;
  }

  try {
    const result = await pool.query(`
      SELECT 
        p.category,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(oi.quantity), 0) as items_sold,
        COALESCE(SUM(oi.quantity * oi.price_at_time), 0) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${dateFilter} AND o.status = 'completed'
      GROUP BY p.category
      ORDER BY revenue DESC
    `);

    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/logs
 * Get activity logs (Admin/Owner only)
 */
app.get('/api/logs', verifyToken, requireAdmin, async (req, res) => {
  const { limit, page, user_id, action } = req.query;
  const recordLimit = Math.min(Number(limit) || 50, 200);
  const pageNum = Number(page) || 1;
  const offset = (pageNum - 1) * recordLimit;

  // ✅ CHANGED: Dynamic parameterized query for PostgreSQL
  let sql = `
    SELECT al.*, u.name as user_name, u.email as user_email
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 0;

  if (user_id) {
    paramIndex++;
    sql += ` AND al.user_id = $${paramIndex}`;
    params.push(user_id);
  }

  if (action) {
    paramIndex++;
    sql += ` AND al.action = $${paramIndex}`;
    params.push(action);
  }

  paramIndex++;
  sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
  params.push(recordLimit);

  paramIndex++;
  sql += ` OFFSET $${paramIndex}`;
  params.push(offset);

  try {
    const result = await pool.query(sql, params);
    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/categories
 * Get all categories
 */
app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(result.rows || []);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/categories
 * Add new category (Admin/Owner only)
 */
app.post('/api/categories', verifyToken, requireAdmin, async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Category name is required' });
  }

  try {
    // ✅ CHANGED: RETURNING id
    const result = await pool.query(
      "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id",
      [name.trim(), description || null]
    );

    res.status(201).json({
      success: true,
      category: {
        id: result.rows[0].id,
        name: name.trim(),
        description
      }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Category already exists' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/categories/:id
 * Delete category (Admin/Owner only)
 */
app.delete('/api/categories/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if category is in use
    const checkResult = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = $1)",
      [id]
    );

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. ${checkResult.rows[0].count} products are using it.`
      });
    }

    const result = await pool.query("DELETE FROM categories WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🔥 Server Error:', err);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Don't leak error details in production
  const message = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({ 
    success: false,
    error: message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════

const shutdown = (signal) => {
  console.log(`\n📛 Received ${signal}. Shutting down gracefully...`);
  
  // ✅ CHANGED: pool.end() instead of db.close()
  pool.end()
    .then(() => {
      console.log('✅ Database pool closed');
      console.log('👋 Server shut down complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error closing database pool:', err);
      process.exit(1);
    });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💀 Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💀 Unhandled Rejection at:', promise, 'reason:', reason);
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('   ███████╗████████╗██╗  ██╗██╗ ██████╗ ██████╗  ██████╗ ███████╗');
  console.log('   ██╔════╝╚══██╔══╝██║  ██║██║██╔═══██╗██╔══██╗██╔═══██╗██╔════╝');
  console.log('   █████╗     ██║   ███████║██║██║   ██║██████╔╝██║   ██║███████╗');
  console.log('   ██╔══╝     ██║   ██╔══██║██║██║   ██║██╔═══╝ ██║   ██║╚════██║');
  console.log('   ███████╗   ██║   ██║  ██║██║╚██████╔╝██║     ╚██████╔╝███████║');
  console.log('   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`   🚀 EthioPOS Server v3.0.0`);
  console.log(`   📡 URL: http://0.0.0.0:${PORT}`);
  console.log(`   🌍 Environment: ${NODE_ENV}`);
  console.log(`   🔒 Security: Helmet + Rate Limiting + JWT Auth`);
  console.log(`   📦 Database: PostgreSQL (Neon.tech)`);
  console.log(`   ⏰ Started: ${new Date().toLocaleString()}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('   📧 Default Login:');
  console.log('      Email: owner@ethiopos.com');
  console.log('      Password: owner123');
  console.log('');
  console.log('   ✅ Critical Endpoint Added:');
  console.log('      GET /api/auth/verify - Token validation for frontend');
  console.log('');
  console.log('   ⚠️  Change default password in production!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

module.exports = app;