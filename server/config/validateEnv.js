/**
 * Environment Variables Validation
 * Updated for PostgreSQL
 */

const validateEnv = () => {
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
  const recommendedVars = ['PORT', 'FRONTEND_URL', 'NODE_ENV'];

  const missing = [];
  const warnings = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  recommendedVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 CRITICAL: Missing required environment variables:');
    missing.forEach(v => console.error(`   ❌ ${v}`));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (process.env.NODE_ENV === 'production') {
      console.error('💀 Cannot start in production without required variables!');
      process.exit(1);
    } else {
      console.warn('⚠️  Using development fallbacks (INSECURE for production)');
    }
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Missing recommended environment variables:');
    warnings.forEach(v => console.warn(`   ⚡ ${v} (using default)`));
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgres')) {
    console.error('❌ DATABASE_URL must start with postgresql:// or postgres://');
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
};

module.exports = validateEnv;