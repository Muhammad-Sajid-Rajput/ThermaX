import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, ROLES } from '../models/User.js';

dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/promoteAdmin.js <email>');
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    user.role = ROLES.ADMIN;
    await user.save();

    console.log(`Success: User ${user.email} (${user.name}) is now an ADMIN.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error promoting user:', error);
    process.exit(1);
  }
}

main();
