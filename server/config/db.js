/**
 * Database Configuration
 * FIXED FOR RENDER DEPLOYMENT
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// ✅ FIX: Correct path for Render (Production) vs Local (Development)
const isProduction = process.env.NODE_ENV === 'production';

// On Render, we MUST use /tmp/ directory. It's the only writable place.
const dbDir = isProduction 
  ? '/tmp' 
  : path.join(__dirname, '..', 'database');

// Ensure directory exists (Critical for Local dev, harmless on Render)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ethiopos.db');

console.log(`📦 Database Path: ${dbPath}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

const db = new sqlite3.Database(dbPath);

// Enable foreign keys and WAL mode
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

/**
 * Initialize database tables
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'staff' CHECK(role IN ('owner', 'admin', 'staff')),
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL DEFAULT 0,
          stock INTEGER NOT NULL DEFAULT 0,
          category TEXT DEFAULT 'General',
          barcode TEXT UNIQUE,
          image_url TEXT,
          description TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_amount REAL NOT NULL,
          items_count INTEGER NOT NULL DEFAULT 0,
          staff_id INTEGER,
          status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
          payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'card', 'mobile', 'credit')),
          customer_name TEXT,
          customer_phone TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (staff_id) REFERENCES users(id)
        )
      `);

      // Order items table
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price_at_time REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Activity log table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON orders(staff_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

      // Default Owner Creation
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'owner'", [], async (err, row) => {
        if (err) {
          console.error("Error checking for owner:", err);
          return;
        }

        if (row.count === 0) {
          try {
            const hashedPassword = await bcrypt.hash('owner123', 12);
            db.run(
              `INSERT INTO users (name, email, password, role, status) 
               VALUES (?, ?, ?, 'owner', 'active')`,
              ['System Owner', 'owner@ethiopos.com', hashedPassword],
              function(insertErr) {
                if (insertErr) {
                  if (!insertErr.message.includes('UNIQUE constraint')) {
                    console.error("Error creating default owner:", insertErr);
                  }
                } else {
                  console.log('✅ Default owner account created');
                  console.log('   📧 Email: owner@ethiopos.com');
                  console.log('   🔑 Password: owner123');
                }
              }
            );
          } catch (hashError) {
            console.error("Error hashing password:", hashError);
          }
        }
      });

      // Default Categories
      db.get("SELECT COUNT(*) as count FROM categories", [], (err, row) => {
        if (!err && row.count === 0) {
          const defaultCategories = ['General', 'Food', 'Beverages', 'Electronics', 'Clothing', 'Household'];
          defaultCategories.forEach(cat => {
            db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [cat]);
          });
          console.log('✅ Default categories created');
        }
      });

      resolve();
    });
  });
};

// Initialize
initializeDatabase()
  .then(() => {
    console.log('✅ Database initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err);
  });

module.exports = db;