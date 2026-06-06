import bcrypt from 'bcryptjs';

/**
 * Utility for generating bcrypt password hashes.
 * Usage: node utils/generateHash.js (add password as arg or hardcode in main)
 */
async function generateHash(password) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  return { password, hash };
}

// Uncomment to test:
// generateHash('demo123').then(res => console.log('Hash:', res.hash));
