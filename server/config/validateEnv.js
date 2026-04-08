/**
 * Environment Variables Validation
 * Ensures all required environment variables are set
 */

const validateEnv = () => {
  const requiredVars = ['JWT_SECRET'];
  const recommendedVars = ['PORT', 'FRONTEND_URL', 'NODE_ENV'];
  
  const missing = [];
  const warnings = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check recommended variables
  recommendedVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  // Report missing required variables
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

  // Report warnings for recommended variables
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Missing recommended environment variables:');
    warnings.forEach(v => console.warn(`   ⚡ ${v} (using default)`));
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
};

module.exports = validateEnv;