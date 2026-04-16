/**
 * Database Configuration - PostgreSQL (Neon.tech)
 * ═══════════════════════════════════════════════
 * Replaces SQLite with PostgreSQL using pg Pool
 * Provides same API interface so server.js changes are minimal
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════
// CONNECTION SETUP
// ═══════════════════════════════════════════════════════════════

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in environment variables!');
  console.error('   Get your connection string from https://neon.tech');
  console.error('   Format: postgresql://user:pass@host/dbname?sslmode=require');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon.tech
  },
  max: 10,                  // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000 // Timeout after 10s if can't connect
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(result => {
    console.log(`✅ PostgreSQL connected at ${result.rows[0].now}`);
    console.log(`📦 Database: Neon.tech (PostgreSQL)`);
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('   Check your DATABASE_URL in .env file');
    process.exit(1);
  });

// ═══════════════════════════════════════════════════════════════
// COMPATIBILITY LAYER
// ═══════════════════════════════════════════════════════════════
// These functions mimic SQLite's db.run(), db.get(), db.all()
// so your server.js routes need minimal changes

const db = {
  /**
   * db.run(sql, params, callback)
   * For INSERT, UPDATE, DELETE
   * Mimics SQLite's db.run with this.lastID and this.changes
   */
  run: (sql, params = [], callback) => {
    // Convert ? placeholders to $1, $2, etc for PostgreSQL
    const pgSql = convertPlaceholders(sql);
    
    pool.query(pgSql, params)
      .then(result => {
        if (callback) {
          // Mimic SQLite's this.lastID and this.changes
          const context = {
            lastID: result.rows[0]?.id || null,
            changes: result.rowCount || 0
          };
          callback.call(context, null);
        }
      })
      .catch(err => {
        console.error('DB Run Error:', err.message);
        console.error('SQL:', pgSql);
        if (callback) {
          // Convert PostgreSQL errors to SQLite-like messages
          const sqliteErr = convertError(err);
          callback.call({ lastID: null, changes: 0 }, sqliteErr);
        }
      });
  },

  /**
   * db.get(sql, params, callback)
   * For SELECT single row
   */
  get: (sql, params = [], callback) => {
    const pgSql = convertPlaceholders(sql);
    
    pool.query(pgSql, params)
      .then(result => {
        if (callback) {
          callback(null, result.rows[0] || null);
        }
      })
      .catch(err => {
        console.error('DB Get Error:', err.message);
        console.error('SQL:', pgSql);
        if (callback) {
          callback(convertError(err), null);
        }
      });
  },

  /**
   * db.all(sql, params, callback)
   * For SELECT multiple rows
   */
  all: (sql, params = [], callback) => {
    const pgSql = convertPlaceholders(sql);
    
    pool.query(pgSql, params)
      .then(result => {
        if (callback) {
          callback(null, result.rows || []);
        }
      })
      .catch(err => {
        console.error('DB All Error:', err.message);
        console.error('SQL:', pgSql);
        if (callback) {
          callback(convertError(err), []);
        }
      });
  },

  /**
   * db.serialize(callback)
   * PostgreSQL doesn't need serialize - just run the callback
   */
  serialize: (callback) => {
    if (callback) callback();
  },

  /**
   * db.close(callback)
   * Close all pool connections
   */
  close: (callback) => {
    pool.end()
      .then(() => {
        if (callback) callback(null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  },

  // Direct pool access for advanced queries
  pool: pool
};

// ═══════════════════════════════════════════════════════════════
// SQL CONVERSION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert ? placeholders to $1, $2, etc
 * Also converts SQLite-specific syntax to PostgreSQL
 */
function convertPlaceholders(sql) {
  let paramIndex = 0;
  let converted = sql;

  // Replace ? with $1, $2, $3, etc
  converted = converted.replace(/\?/g, () => {
    paramIndex++;
    return `$${paramIndex}`;
  });

  // ─── SQLite → PostgreSQL syntax conversions ───

  // date('now', 'localtime') → CURRENT_DATE
  converted = converted.replace(
    /date\('now',\s*'localtime'\)/gi,
    'CURRENT_DATE'
  );

  // date('now') → CURRENT_DATE
  converted = converted.replace(
    /date\('now'\)/gi,
    'CURRENT_DATE'
  );

  // date('now', '-1 day', 'localtime') → CURRENT_DATE - INTERVAL '1 day'
  converted = converted.replace(
    /date\('now',\s*'-(\d+)\s*day(?:s)?',\s*'localtime'\)/gi,
    "CURRENT_DATE - INTERVAL '$1 days'"
  );

  // date('now', '-1 day') → CURRENT_DATE - INTERVAL '1 day'
  converted = converted.replace(
    /date\('now',\s*'-(\d+)\s*day(?:s)?'\)/gi,
    "CURRENT_DATE - INTERVAL '$1 days'"
  );

  // date('now', '-7 days') → CURRENT_DATE - INTERVAL '7 days'
  converted = converted.replace(
    /date\('now',\s*'-(\d+)\s*days'\)/gi,
    "CURRENT_DATE - INTERVAL '$1 days'"
  );

  // date('now', '-30 days') → NOW() - INTERVAL '30 days'
  converted = converted.replace(
    /date\('now',\s*'-(\d+)\s*days'\)/gi,
    "NOW() - INTERVAL '$1 days'"
  );

  // date('now', '-365 days') → NOW() - INTERVAL '365 days'
  converted = converted.replace(
    /date\('now',\s*'-(\d+)\s*days'\)/gi,
    "NOW() - INTERVAL '$1 days'"
  );

  // date(created_at) = date('now') → DATE(created_at) = CURRENT_DATE
  converted = converted.replace(
    /date\((\w+(?:\.\w+)?)\)\s*=\s*CURRENT_DATE/gi,
    'DATE($1) = CURRENT_DATE'
  );

  // date(column) → DATE(column) (already valid in PostgreSQL)

  // strftime('%H', created_at) → EXTRACT(HOUR FROM created_at)::TEXT
  converted = converted.replace(
    /strftime\('%H',\s*(\w+(?:\.\w+)?)\)/gi,
    "LPAD(EXTRACT(HOUR FROM $1)::TEXT, 2, '0')"
  );

  // COALESCE(notes || ' | ', '') → COALESCE(notes || ' | ', '')
  // This is already valid PostgreSQL

  // INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
  // (handled in table creation only)

  // MAX(0, stock + ?) → GREATEST(0, stock + $N)
  converted = converted.replace(
    /MAX\(0,\s*/gi,
    'GREATEST(0, '
  );

  return converted;
}

/**
 * Convert PostgreSQL errors to SQLite-compatible error messages
 * So your existing error handling code still works
 */
function convertError(pgError) {
  const err = new Error(pgError.message);

  // Unique constraint violation
  if (pgError.code === '23505') {
    err.message = 'UNIQUE constraint failed: ' + (pgError.detail || pgError.constraint);
  }

  // Foreign key violation
  if (pgError.code === '23503') {
    err.message = 'FOREIGN KEY constraint failed: ' + (pgError.detail || '');
  }

  // Not null violation
  if (pgError.code === '23502') {
    err.message = 'NOT NULL constraint failed: ' + pgError.column;
  }

  // Check constraint violation
  if (pgError.code === '23514') {
    err.message = 'CHECK constraint failed: ' + (pgError.constraint || '');
  }

  return err;
}

// ═══════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION (Create Tables)
// ═══════════════════════════════════════════════════════════════

const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Initializing database tables...');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'staff' CHECK(role IN ('owner', 'admin', 'staff')),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'pending', 'inactive', 'suspended')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        category TEXT DEFAULT 'General',
        barcode TEXT UNIQUE,
        image_url TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        total_amount REAL NOT NULL,
        items_count INTEGER NOT NULL DEFAULT 0,
        staff_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
        payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'card', 'mobile', 'credit')),
        customer_name TEXT,
        customer_phone TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price_at_time REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        customer_name TEXT DEFAULT 'Anonymous',
        message TEXT NOT NULL,
        type TEXT DEFAULT 'feedback' CHECK(type IN ('feedback', 'complaint', 'suggestion', 'praise')),
        rating INTEGER DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved')),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ─── Indexes ──────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON orders(staff_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

    console.log('✅ All tables created');

    // ─── Default Owner ────────────────────────────────────────
    const ownerCheck = await client.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'owner'"
    );

    if (parseInt(ownerCheck.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('owner123', 12);
      await client.query(
        `INSERT INTO users (name, email, password, role, status)
         VALUES ($1, $2, $3, 'owner', 'active')
         ON CONFLICT (email) DO NOTHING`,
        ['System Owner', 'owner@ethiopos.com', hashedPassword]
      );
      console.log('✅ Default owner account created');
      console.log('   📧 Email: owner@ethiopos.com');
      console.log('   🔑 Password: owner123');
      console.log('   ⚠️  Change this password immediately!');
    }

    // ─── Default Categories ───────────────────────────────────
    const catCheck = await client.query("SELECT COUNT(*) as count FROM categories");

    if (parseInt(catCheck.rows[0].count) === 0) {
      const cats = ['General', 'Food', 'Beverages', 'Electronics', 'Clothing', 'Household'];
      for (const cat of cats) {
        await client.query(
          "INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
          [cat]
        );
      }
      console.log('✅ Default categories created');
    }

    console.log('✅ Database initialization complete');

  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

/// Run initialization
initializeDatabase().catch(err => {
  console.error('💀 Fatal: Could not initialize database:', err);
  process.exit(1);
});

// ✅ FIXED: Export pool directly - nothing else
module.exports = pool;
