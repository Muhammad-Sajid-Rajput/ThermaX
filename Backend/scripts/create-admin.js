/**
 * One-off admin account creation for real deployments.
 * (scripts/promoteAdmin.js upgrades an existing user; this creates a new one.)
 *
 * Usage: node scripts/create-admin.js <name> <email> <password>
 *    or: ADMIN_PASSWORD=<password> node scripts/create-admin.js <name> <email>
 *        (preferred — argv exposes the password in shell history and the
 *        process list)
 * Env:   MONGO_URI (default mongodb://localhost:27017/thermax)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, ROLES } from '../models/User.js';
import { passwordSchema } from '../middleware/validation.js';

dotenv.config();

const [name, email, passwordArg] = process.argv.slice(2);
// Prefer the env var: a password on the command line is visible in shell
// history and to anyone who can list processes.
const password = process.env.ADMIN_PASSWORD || passwordArg;

if (!name || !email || !password) {
  console.error('Usage: node scripts/create-admin.js <name> <email> <password>');
  console.error('   or: ADMIN_PASSWORD=<password> node scripts/create-admin.js <name> <email>');
  process.exit(1);
}

const { error: pwdErr } = passwordSchema.validate(password);
if (pwdErr) {
  console.error(`Admin password does not meet security policy: ${pwdErr.message}`);
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';

async function main() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    console.error(`User with email "${normalizedEmail}" already exists.`);
    process.exit(1);
  }

  const admin = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });

  console.log(`Created ADMIN account: ${admin.email} (${admin.name})`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('create-admin failed:', err);
  process.exit(1);
});
