/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EthioPOS Backend Server
 * Version: 2.1.0 (Production Ready)
 * Complete API with Authentication, Products, Sales, Staff, and Analytics
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

const db = require('./config/db');
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

// Custom request logging
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  
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
app.get('/api/health', (req, res) => {
  const startTime = Date.now();
  
  db.get("SELECT 1 as check", [], (err) => {
    const dbResponseTime = Date.now() - startTime;
    
    if (err) {
      return res.status(503).json({
        status: 'unhealthy',
        version: '2.1.0',
        database: {
          status: 'disconnected',
          error: err.message
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      version: '2.1.0',
      environment: NODE_ENV,
      database: {
        status: 'connected',
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
  });
});

/**
 * GET /api/status
 * Simple status check (backward compatible)
 */
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '2.1.0',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Email and password are required' 
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  db.get(
    "SELECT * FROM users WHERE email = ? AND status = 'active'",
    [normalizedEmail],
    async (err, user) => {
      if (err) {
        console.error("Login DB Error:", err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error during authentication' 
        });
      }

      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid email or password' 
        });
      }

      try {
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

        // Log successful login
        db.run(
          "INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
          [user.id, 'LOGIN', 'Successful login', req.ip]
        );

        // Return success response
        res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error("Password compare error:", error);
        res.status(500).json({ 
          success: false,
          error: 'Authentication error' 
        });
      }
    }
  );
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
    db.get("SELECT COUNT(*) as count FROM users", [], async (countErr, countRow) => {
      if (countErr) {
        console.error("Count users error:", countErr);
        return res.status(500).json({ 
          success: false,
          error: 'Database error' 
        });
      }

      const isFirstUser = countRow.count === 0;
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
      db.run(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, 'active')",
        [trimmedName, normalizedEmail, hashedPassword, assignedRole],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ 
                success: false,
                error: 'Email already registered' 
              });
            }
            console.error("Signup error:", err);
            return res.status(500).json({ 
              success: false,
              error: 'Database error during signup' 
            });
          }
          
          // Log account creation
          db.run(
            "INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
            [this.lastID, 'SIGNUP', `Account created with role: ${assignedRole}`, req.ip]
          );

          res.status(201).json({ 
            success: true,
            message: 'Account created successfully', 
            user: { 
              id: this.lastID, 
              name: trimmedName, 
              email: normalizedEmail, 
              role: assignedRole 
            }
          });
        }
      );
    });
  } catch (error) {
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
app.get('/api/auth/verify', verifyToken, (req, res) => {
  // If verifyToken middleware passes, the token is valid and not expired
  // Fetch fresh user data from database to ensure user still exists and is active
  
  db.get(
    "SELECT id, name, email, role, status FROM users WHERE id = ? AND status = 'active'",
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error("Verify token - DB error:", err);
        return res.status(500).json({
          success: false,
          valid: false,
          error: 'Database error during verification'
        });
      }

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
    }
  );
});

/**
 * GET /api/auth/me
 * Get current authenticated user's information
 */
app.get('/api/auth/me', verifyToken, (req, res) => {
  db.get(
    "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error("Get user error:", err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error' 
        });
      }
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
    }
  );
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

  db.get(
    "SELECT password FROM users WHERE id = ?",
    [req.user.id],
    async (err, user) => {
      if (err || !user) {
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

      db.run(
        "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [hashedPassword, req.user.id],
        function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ 
              success: false,
              error: 'Failed to update password' 
            });
          }

          // Log password change
          db.run(
            "INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?, ?, ?)",
            [req.user.id, 'PASSWORD_CHANGE', req.ip]
          );

          res.json({ 
            success: true,
            message: 'Password changed successfully' 
          });
        }
      );
    }
  );
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, server-side logging)
 */
app.post('/api/auth/logout', verifyToken, (req, res) => {
  // Log logout
  db.run(
    "INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?, ?, ?)",
    [req.user.id, 'LOGOUT', req.ip]
  );

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
app.get('/api/products', verifyToken, (req, res) => {
  const { category, search, inStock, page, limit } = req.query;
  
  let sql = "SELECT * FROM products WHERE is_active = 1";
  const params = [];

  // Category filter
  if (category && category !== 'all') {
    sql += " AND category = ?";
    params.push(category);
  }

  // Search filter
  if (search) {
    sql += " AND (name LIKE ? OR barcode LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
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
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Get products error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    res.json(rows || []);
  });
});

/**
 * GET /api/products/categories
 * Get all product categories
 */
app.get('/api/products/categories', verifyToken, (req, res) => {
  db.all(
    "SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category ASC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      const categories = rows.map(r => r.category);
      res.json(categories);
    }
  );
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
app.get('/api/products/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  db.get(
    "SELECT * FROM products WHERE id = ?",
    [id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      if (!product) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }
      res.json(product);
    }
  );
});

/**
 * POST /api/products
 * Add new product (Admin/Owner only)
 */
app.post('/api/products', verifyToken, requireAdmin, (req, res) => {
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

  db.run(
    `INSERT INTO products (name, price, stock, category, barcode, description, image_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productData.name, productData.price, productData.stock, productData.category, 
     productData.barcode, productData.description, productData.image_url],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
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
      
      // Log activity
      db.run(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, 'CREATE', 'product', this.lastID, `Created product: ${productData.name}`]
      );
      
      res.status(201).json({ 
        success: true,
        message: 'Product created successfully',
        id: this.lastID,
        ...productData,
        created_at: new Date().toISOString()
      });
    }
  );
});

/**
 * PUT /api/products/:id
 * Update existing product (Admin/Owner only)
 */
app.put('/api/products/:id', verifyToken, requireAdmin, (req, res) => {
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

  db.run(
    `UPDATE products SET 
      name = ?, price = ?, stock = ?, category = ?, 
      barcode = ?, description = ?, image_url = ?, is_active = ?,
      updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [productData.name, productData.price, productData.stock, productData.category,
     productData.barcode, productData.description, productData.image_url, productData.is_active, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
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
      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }

      // Log activity
      db.run(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, 'UPDATE', 'product', id, `Updated product: ${productData.name}`]
      );

      res.json({ 
        success: true,
        message: 'Product updated successfully',
        id: Number(id)
      });
    }
  );
});

/**
 * PATCH /api/products/:id/stock
 * Update product stock only
 */
app.patch('/api/products/:id/stock', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { stock, adjustment } = req.body;

  if (stock !== undefined) {
    // Set absolute stock value
    db.run(
      "UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [Math.max(0, Number(stock)), id],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, message: 'Stock updated' });
      }
    );
  } else if (adjustment !== undefined) {
    // Adjust stock by value
    db.run(
      "UPDATE products SET stock = MAX(0, stock + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [Number(adjustment), id],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, message: 'Stock adjusted' });
      }
    );
  } else {
    res.status(400).json({ success: false, error: 'Stock or adjustment value required' });
  }
});

/**
 * DELETE /api/products/:id
 * Delete product (Admin/Owner only)
 */
app.delete('/api/products/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;
  
  if (permanent === 'true' && req.user.role === 'owner') {
    // Permanent delete (owner only)
    db.run(
      "DELETE FROM products WHERE id = ?",
      [id],
      function(err) {
        if (err) {
          console.error("Delete product error:", err);
          return res.status(500).json({ 
            success: false,
            error: err.message 
          });
        }
        if (this.changes === 0) {
          return res.status(404).json({ 
            success: false,
            error: 'Product not found' 
          });
        }

        db.run(
          "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
          [req.user.id, 'DELETE_PERMANENT', 'product', id, `Permanently deleted product ID: ${id}`]
        );

        res.json({ 
          success: true,
          message: 'Product permanently deleted' 
        });
      }
    );
  } else {
    // Soft delete
    db.run(
      "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
      function(err) {
        if (err) {
          console.error("Soft delete product error:", err);
          return res.status(500).json({ 
            success: false,
            error: err.message 
          });
        }
        if (this.changes === 0) {
          return res.status(404).json({ 
            success: false,
            error: 'Product not found' 
          });
        }

        db.run(
          "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
          [req.user.id, 'DELETE', 'product', id, `Soft deleted product ID: ${id}`]
        );

        res.json({ 
          success: true,
          message: 'Product deleted successfully' 
        });
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════
// SALES ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/sales
 * Record a new sale transaction with proper transaction handling
 */
app.post('/api/sales', verifyToken, (req, res) => {
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

  // Stock validation
  const stockCheckPromises = items.map(item => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT id, name, stock FROM products WHERE id = ? AND is_active = 1",
        [item.product_id],
        (err, product) => {
          if (err) {
            reject({ error: 'Database error', product_id: item.product_id });
          } else if (!product) {
            reject({ error: `Product not found`, product_id: item.product_id });
          } else if (product.stock < item.quantity) {
            reject({ 
              error: `Insufficient stock for "${product.name}"`, 
              product_id: item.product_id,
              available: product.stock,
              requested: item.quantity 
            });
          } else {
            resolve(product);
          }
        }
      );
    });
  });

  Promise.all(stockCheckPromises)
    .then(() => {
      // All stock checks passed
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Create order
        db.run(
          `INSERT INTO orders (total_amount, items_count, staff_id, status, payment_method, customer_name, customer_phone, notes) 
           VALUES (?, ?, ?, 'completed', ?, ?, ?, ?)`,
          [total_amount, itemCount, staff_id, paymentMethodValue, customer_name || null, customer_phone || null, notes || null],
          function(orderErr) {
            if (orderErr) {
              db.run("ROLLBACK");
              console.error("Create order error:", orderErr);
              return res.status(500).json({ 
                success: false,
                error: 'Failed to create order' 
              });
            }

            const orderId = this.lastID;
            let itemsProcessed = 0;
            let hasError = false;

            // Process each item
            items.forEach((item) => {
              if (hasError) return;

              // Update stock
              db.run(
                "UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [item.quantity, item.product_id],
                function(stockErr) {
                  if (stockErr || hasError) {
                    if (!hasError) {
                      hasError = true;
                      db.run("ROLLBACK");
                      return res.status(500).json({ 
                        success: false,
                        error: 'Stock update failed' 
                      });
                    }
                    return;
                  }

                  // Insert order item
                  db.run(
                    "INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)",
                    [orderId, item.product_id, item.quantity, item.price],
                    function(itemErr) {
                      if (itemErr || hasError) {
                        if (!hasError) {
                          hasError = true;
                          db.run("ROLLBACK");
                          return res.status(500).json({ 
                            success: false,
                            error: 'Order item creation failed' 
                          });
                        }
                        return;
                      }

                      itemsProcessed++;

                      // All items processed
                      if (itemsProcessed === items.length && !hasError) {
                        db.run("COMMIT", function(commitErr) {
                          if (commitErr) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ 
                              success: false,
                              error: 'Transaction commit failed' 
                            });
                          }

                          // Log the sale
                          db.run(
                            "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
                            [staff_id, 'SALE', 'order', orderId, `Sale completed: Br ${total_amount}`]
                          );

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
                        });
                      }
                    }
                  );
                }
              );
            });
          }
        );
      });
    })
    .catch((stockError) => {
      // Stock validation failed
      return res.status(400).json({
        success: false,
        error: stockError.error,
        details: stockError
      });
    });
});

/**
 * GET /api/sales/history
 * Get sales history with optional date range filter
 */
app.get('/api/sales/history', verifyToken, (req, res) => {
  const { range, limit, page, staff_id, status } = req.query;

  let dateFilter = "1=1";
  
  switch(range) {
    case 'today':
      dateFilter = "date(o.created_at) = date('now', 'localtime')";
      break;
    case 'yesterday':
      dateFilter = "date(o.created_at) = date('now', '-1 day', 'localtime')";
      break;
    case 'week':
      dateFilter = "o.created_at >= date('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "o.created_at >= date('now', '-30 days')";
      break;
    case 'year':
      dateFilter = "o.created_at >= date('now', '-365 days')";
      break;
    case 'all':
    default:
      dateFilter = "1=1";
      break;
  }

  let additionalFilters = "";
  const params = [];

  if (staff_id) {
    additionalFilters += " AND o.staff_id = ?";
    params.push(staff_id);
  }

  if (status) {
    additionalFilters += " AND o.status = ?";
    params.push(status);
  }

  const recordLimit = Math.min(Number(limit) || 100, 500);
  const pageNum = Number(page) || 1;
  const offset = (pageNum - 1) * recordLimit;

  // Get total count
  db.get(
    `SELECT COUNT(*) as total FROM orders o WHERE ${dateFilter}${additionalFilters}`,
    params,
    (countErr, countRow) => {
      if (countErr) {
        console.error("Count sales error:", countErr);
        return res.status(500).json({ 
          success: false,
          error: countErr.message 
        });
      }

      const total = countRow?.total || 0;

      // Get paginated results
      db.all(
        `SELECT o.*, u.name as staff_name 
         FROM orders o 
         LEFT JOIN users u ON o.staff_id = u.id 
         WHERE ${dateFilter}${additionalFilters}
         ORDER BY o.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, recordLimit, offset],
        (err, rows) => {
          if (err) {
            console.error("Sales history error:", err);
            return res.status(500).json({ 
              success: false,
              error: err.message 
            });
          }

          // Add receipt numbers
          const salesWithReceipts = (rows || []).map(sale => ({
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
        }
      );
    }
  );
});

/**
 * GET /api/sales/:id
 * Get single sale with items
 */
app.get('/api/sales/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT o.*, u.name as staff_name 
     FROM orders o 
     LEFT JOIN users u ON o.staff_id = u.id 
     WHERE o.id = ?`,
    [id],
    (err, order) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: 'Order not found' 
        });
      }

      // Get order items
      db.all(
        `SELECT oi.*, p.name as product_name, p.category 
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [id],
        (itemsErr, items) => {
          if (itemsErr) {
            return res.status(500).json({ 
              success: false,
              error: itemsErr.message 
            });
          }
          
          res.json({
            success: true,
            order: {
              ...order,
              receiptNumber: `ETH-${order.id.toString().padStart(6, '0')}`,
              items: items || []
            }
          });
        }
      );
    }
  );
});

/**
 * PUT /api/sales/:id/status
 * Update sale status (for refunds/cancellations)
 */
app.put('/api/sales/:id/status', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['pending', 'completed', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }

  // Get current order
  db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
    if (err || !order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // If refunding or cancelling, restore stock
    if ((status === 'refunded' || status === 'cancelled') && order.status === 'completed') {
      db.all(
        "SELECT * FROM order_items WHERE order_id = ?",
        [id],
        (itemsErr, items) => {
          if (itemsErr) {
            return res.status(500).json({ 
              success: false,
              error: 'Failed to get order items' 
            });
          }

          db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Restore stock for each item
            items.forEach(item => {
              db.run(
                "UPDATE products SET stock = stock + ? WHERE id = ?",
                [item.quantity, item.product_id]
              );
            });

            // Update order status
            db.run(
              "UPDATE orders SET status = ?, notes = COALESCE(notes || ' | ', '') || ? WHERE id = ?",
              [status, `${status.toUpperCase()}: ${reason || 'No reason provided'}`, id],
              function(updateErr) {
                if (updateErr) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ 
                    success: false,
                    error: 'Failed to update order' 
                  });
                }

                db.run("COMMIT");

                // Log activity
                db.run(
                  "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
                  [req.user.id, status.toUpperCase(), 'order', id, reason || 'Status updated']
                );

                res.json({ 
                  success: true,
                  message: `Order ${status} successfully` 
                });
              }
            );
          });
        }
      );
    } else {
      // Simple status update without stock adjustment
      db.run(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, id],
        function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ 
              success: false,
              error: 'Failed to update order' 
            });
          }

          res.json({ 
            success: true,
            message: `Order status updated to ${status}` 
          });
        }
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// STAFF ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/staff
 * Get all staff members
 */
app.get('/api/staff', verifyToken, (req, res) => {
  const { status, role } = req.query;
  
  let sql = "SELECT id, name, email, role, status, created_at FROM users WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  if (role) {
    sql += " AND role = ?";
    params.push(role);
  }

  sql += " ORDER BY name ASC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Get staff error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    res.json(rows || []);
  });
});

/**
 * GET /api/staff/:id
 * Get single staff member with stats
 */
app.get('/api/staff/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT id, name, email, role, status, created_at FROM users WHERE id = ?",
    [id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'Staff member not found' 
        });
      }

      // Get staff stats
      db.get(
        `SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(CASE WHEN date(created_at) = date('now', 'localtime') THEN 1 END) as today_sales
         FROM orders 
         WHERE staff_id = ? AND status = 'completed'`,
        [id],
        (statsErr, stats) => {
          res.json({
            success: true,
            staff: {
              ...user,
              stats: stats || { total_sales: 0, total_revenue: 0, today_sales: 0 }
            }
          });
        }
      );
    }
  );
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

    db.run(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, 'active')",
      [trimmedName, normalizedEmail, hashedPassword, normalizedRole],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ 
              success: false,
              error: 'Email already exists' 
            });
          }
          console.error("Add staff error:", err);
          return res.status(500).json({ 
            success: false,
            error: err.message 
          });
        }

        // Log activity
        db.run(
          "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
          [req.user.id, 'CREATE', 'user', this.lastID, `Created staff: ${trimmedName} (${normalizedRole})`]
        );
        
        res.status(201).json({ 
          success: true,
          message: 'Staff member created successfully',
          staff: {
            id: this.lastID,
            name: trimmedName,
            email: normalizedEmail,
            role: normalizedRole,
            status: 'active',
            created_at: new Date().toISOString()
          }
        });
      }
    );
  } catch (error) {
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

  // Build update query dynamically
  const updates = [];
  const values = [];

  if (name) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (email) {
    updates.push('email = ?');
    values.push(email.toLowerCase().trim());
  }
  if (normalizedRole) {
    updates.push('role = ?');
    values.push(normalizedRole);
  }
  if (status) {
    updates.push('status = ?');
    values.push(status);
  }
  if (password && password.length >= 6) {
    const hashedPassword = await bcrypt.hash(password, 12);
    updates.push('password = ?');
    values.push(hashedPassword);
  }

  if (updates.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'No valid fields to update' 
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
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
      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Staff member not found' 
        });
      }

      // Log activity
      db.run(
        "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, 'UPDATE', 'user', id, `Updated staff ID: ${id}`]
      );

      res.json({ 
        success: true,
        message: 'Staff member updated successfully' 
      });
    }
  );
});

/**
 * DELETE /api/staff/:id
 * Delete staff member (Owner only)
 */
app.delete('/api/staff/:id', verifyToken, requireOwner, (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  // Prevent self-deletion
  if (parseInt(id) === req.user.id) {
    return res.status(403).json({ 
      success: false,
      error: 'Cannot delete your own account' 
    });
  }

  if (permanent === 'true') {
    // Check if user has orders
    db.get(
      "SELECT COUNT(*) as count FROM orders WHERE staff_id = ?",
      [id],
      (countErr, countRow) => {
        if (countErr) {
          return res.status(500).json({ success: false, error: countErr.message });
        }

        if (countRow.count > 0) {
          return res.status(400).json({
            success: false,
            error: `Cannot permanently delete. User has ${countRow.count} orders. Deactivate instead.`
          });
        }

        db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
          }

          db.run(
            "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
            [req.user.id, 'DELETE_PERMANENT', 'user', id, `Permanently deleted user ID: ${id}`]
          );

          res.json({ success: true, message: 'Staff member permanently deleted' });
        });
      }
    );
  } else {
    // Soft delete (deactivate)
    db.run(
      "UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
      function(err) {
        if (err) {
          console.error("Delete staff error:", err);
          return res.status(500).json({ 
            success: false,
            error: err.message 
          });
        }
        if (this.changes === 0) {
          return res.status(404).json({ 
            success: false,
            error: 'Staff member not found' 
          });
        }

        db.run(
          "INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
          [req.user.id, 'DEACTIVATE', 'user', id, `Deactivated user ID: ${id}`]
        );

        res.json({ 
          success: true,
          message: 'Staff member deactivated successfully' 
        });
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard statistics
 */
app.get('/api/analytics/dashboard', verifyToken, (req, res) => {
  const queries = {
    todayStats: `
      SELECT 
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders,
        COALESCE(AVG(total_amount), 0) as avg_order
      FROM orders 
      WHERE date(created_at) = date('now', 'localtime') 
      AND status = 'completed'
    `,
    yesterdayStats: `
      SELECT 
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE date(created_at) = date('now', '-1 day', 'localtime')
      AND status = 'completed'
    `,
    weekStats: `
      SELECT 
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE created_at >= date('now', '-7 days')
      AND status = 'completed'
    `,
    monthStats: `
      SELECT 
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE created_at >= date('now', '-30 days')
      AND status = 'completed'
    `,
    staffCount: `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active
      FROM users
    `,
    productStats: `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock,
        COUNT(CASE WHEN stock <= 10 AND stock > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock
      FROM products 
      WHERE is_active = 1
    `
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, sql]) => {
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error(`Dashboard query error (${key}):`, err);
        results[key] = null;
      } else {
        results[key] = row;
      }

      completed++;
      if (completed === totalQueries) {
        // Calculate changes
        const todayRev = results.todayStats?.revenue || 0;
        const yestRev = results.yesterdayStats?.revenue || 0;
        const todayOrders = results.todayStats?.orders || 0;
        const yestOrders = results.yesterdayStats?.orders || 0;

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
              averageOrder: results.todayStats?.avg_order || 0,
              revenueChange: revChange,
              ordersChange: orderChange
            },
            week: results.weekStats,
            month: results.monthStats,
            staff: results.staffCount,
            products: results.productStats
          },
          timestamp: new Date().toISOString()
        });
      }
    });
  });
});

/**
 * GET /api/analytics/daily-stats
 * Get daily business statistics
 */
app.get('/api/analytics/daily-stats', verifyToken, (req, res) => {
  const statsQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN date(created_at) = date('now', 'localtime') THEN total_amount ELSE 0 END), 0) as today_rev,
      COUNT(CASE WHEN date(created_at) = date('now', 'localtime') AND status = 'completed' THEN id END) as today_orders,
      COALESCE(SUM(CASE WHEN date(created_at) = date('now', '-1 day', 'localtime') THEN total_amount ELSE 0 END), 0) as yesterday_rev,
      COUNT(CASE WHEN date(created_at) = date('now', '-1 day', 'localtime') AND status = 'completed' THEN id END) as yesterday_orders,
      (SELECT COUNT(*) FROM users WHERE status = 'active') as active_staff,
      (SELECT COUNT(*) FROM products WHERE stock > 0 AND is_active = 1) as products_in_stock
    FROM orders
    WHERE status = 'completed'
  `;

  db.get(statsQuery, [], (err, row) => {
    if (err) {
      console.error("Daily stats error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }

    const todayRev = row?.today_rev || 0;
    const yestRev = row?.yesterday_rev || 0;
    const todayOrders = row?.today_orders || 0;
    const yesterdayOrders = row?.yesterday_orders || 0;

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
        value: (row?.active_staff || 0).toString(), 
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
  });
});

/**
 * GET /api/analytics/top-products
 * Get top selling products
 */
app.get('/api/analytics/top-products', verifyToken, (req, res) => {
  const { limit, range } = req.query;
  const productLimit = Math.min(Number(limit) || 5, 20);

  let dateFilter = "date(o.created_at) = date('now', 'localtime')";
  
  switch(range) {
    case 'yesterday':
      dateFilter = "date(o.created_at) = date('now', '-1 day', 'localtime')";
      break;
    case 'week':
      dateFilter = "o.created_at >= date('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "o.created_at >= date('now', '-30 days')";
      break;
    case 'year':
      dateFilter = "o.created_at >= date('now', '-365 days')";
      break;
    case 'all':
      dateFilter = "1=1";
      break;
  }

  const sql = `
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
    GROUP BY p.id
    ORDER BY sales DESC
    LIMIT ?
  `;

  db.all(sql, [productLimit], (err, rows) => {
    if (err) {
      console.error("Top products error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    
    res.json((rows || []).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      sales: row.sales,
      revenue: `Br ${(row.revenue || 0).toLocaleString()}`
    })));
  });
});

/**
 * GET /api/analytics/revenue-trend
 * Get revenue trend for specified period
 */
app.get('/api/analytics/revenue-trend', verifyToken, (req, res) => {
  const { days } = req.query;
  const numDays = Math.min(Number(days) || 7, 365);

  const sql = `
    SELECT 
      date(created_at) as date,
      COALESCE(SUM(total_amount), 0) as revenue,
      COUNT(*) as orders,
      COALESCE(AVG(total_amount), 0) as average
    FROM orders
    WHERE created_at >= date('now', '-${numDays} days')
    AND status = 'completed'
    GROUP BY date(created_at)
    ORDER BY date ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Revenue trend error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    res.json({
      success: true,
      data: rows || [],
      period: `${numDays} days`
    });
  });
});

/**
 * GET /api/analytics/hourly-sales
 * Get sales by hour for today
 */
app.get('/api/analytics/hourly-sales', verifyToken, (req, res) => {
  const sql = `
    SELECT 
      strftime('%H', created_at) as hour,
      COUNT(*) as orders,
      COALESCE(SUM(total_amount), 0) as revenue
    FROM orders
    WHERE date(created_at) = date('now', 'localtime')
    AND status = 'completed'
    GROUP BY strftime('%H', created_at)
    ORDER BY hour ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    const hoursMap = {};
    (rows || []).forEach(r => {
      hoursMap[parseInt(r.hour)] = {
        hour: parseInt(r.hour),
        orders: r.orders,
        revenue: r.revenue
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
  });
});

/**
 * GET /api/analytics/low-stock
 * Get products with low stock
 */
app.get('/api/analytics/low-stock', verifyToken, (req, res) => {
  const threshold = Number(req.query.threshold) || 10;

  db.all(
    `SELECT id, name, price, stock, category 
     FROM products 
     WHERE stock <= ? AND is_active = 1 
     ORDER BY stock ASC`,
    [threshold],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      res.json(rows || []);
    }
  );
});

/**
 * GET /api/analytics/staff-performance
 * Get staff performance metrics
 */
app.get('/api/analytics/staff-performance', verifyToken, requireAdmin, (req, res) => {
  const { range } = req.query;
  
  let dateFilter = "date(o.created_at) = date('now', 'localtime')";
  
  switch(range) {
    case 'week':
      dateFilter = "o.created_at >= date('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "o.created_at >= date('now', '-30 days')";
      break;
    case 'all':
      dateFilter = "1=1";
      break;
  }

  const sql = `
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
    GROUP BY u.id
    ORDER BY total_revenue DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({
      success: true,
      data: rows || []
    });
  });
});

/**
 * GET /api/analytics/category-breakdown
 * Get sales breakdown by category
 */
app.get('/api/analytics/category-breakdown', verifyToken, (req, res) => {
  const { range } = req.query;
  
  let dateFilter = "date(o.created_at) = date('now', 'localtime')";
  
  switch(range) {
    case 'week':
      dateFilter = "o.created_at >= date('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "o.created_at >= date('now', '-30 days')";
      break;
  }

  const sql = `
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
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({
      success: true,
      data: rows || []
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/logs
 * Get activity logs (Admin/Owner only)
 */
app.get('/api/logs', verifyToken, requireAdmin, (req, res) => {
  const { limit, page, user_id, action } = req.query;
  const recordLimit = Math.min(Number(limit) || 50, 200);
  const pageNum = Number(page) || 1;
  const offset = (pageNum - 1) * recordLimit;

  let sql = `
    SELECT al.*, u.name as user_name, u.email as user_email
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    sql += " AND al.user_id = ?";
    params.push(user_id);
  }

  if (action) {
    sql += " AND al.action = ?";
    params.push(action);
  }

  sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  params.push(recordLimit, offset);

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({
      success: true,
      data: rows || []
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/categories
 * Get all categories
 */
app.get('/api/categories', verifyToken, (req, res) => {
  db.all(
    "SELECT * FROM categories ORDER BY name ASC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json(rows || []);
    }
  );
});

/**
 * POST /api/categories
 * Add new category (Admin/Owner only)
 */
app.post('/api/categories', verifyToken, requireAdmin, (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Category name is required' });
  }

  db.run(
    "INSERT INTO categories (name, description) VALUES (?, ?)",
    [name.trim(), description || null],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ success: false, error: 'Category already exists' });
        }
        return res.status(500).json({ success: false, error: err.message });
      }
      res.status(201).json({
        success: true,
        category: {
          id: this.lastID,
          name: name.trim(),
          description
        }
      });
    }
  );
});

/**
 * DELETE /api/categories/:id
 * Delete category (Admin/Owner only)
 */
app.delete('/api/categories/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)",
    [id],
    (checkErr, row) => {
      if (checkErr) {
        return res.status(500).json({ success: false, error: checkErr.message });
      }

      if (row.count > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete category. ${row.count} products are using it.`
        });
      }

      db.run("DELETE FROM categories WHERE id = ?", [id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, message: 'Category deleted' });
      });
    }
  );
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
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    
    console.log('👋 Server shut down complete');
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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

const server = app.listen(PORT, () => {
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
  console.log(`   🚀 EthioPOS Server v2.1.0`);
  console.log(`   📡 URL: http://localhost:${PORT}`);
  console.log(`   🌍 Environment: ${NODE_ENV}`);
  console.log(`   🔒 Security: Helmet + Rate Limiting + JWT Auth`);
  console.log(`   📦 Database: SQLite (WAL mode)`);
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