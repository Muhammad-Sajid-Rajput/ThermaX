import bcrypt from 'bcryptjs';

async function generateHash(password) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);

  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Verification: ${isValid}`);
}

generateHash('demo123');
generateHash('admin123');
