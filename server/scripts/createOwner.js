/**
 * ONE-TIME SCRIPT: Creates the first Owner account
 * Run with: node scripts/createOwner.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const createOwner = async () => {
  const name = "System Owner";
  const email = "owner@ethiopos.com";
  const password = "owner123"; // CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!
  const role = "owner";
  const status = "active";

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    db.run(
      `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, status],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            console.log("⚠️  Owner account already exists!");
          } else {
            console.error("❌ Error:", err.message);
          }
        } else {
          console.log("✅ Owner account created successfully!");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("📧 Email:", email);
          console.log("🔑 Password:", password);
          console.log("👤 Role:", role);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          console.log("⚠️  IMPORTANT: Change this password immediately after first login!");
        }
        process.exit();
      }
    );
  } catch (error) {
    console.error("❌ Script Error:", error);
    process.exit(1);
  }
};

createOwner();