import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Backend/.env directly without external deps
const envPath = path.resolve(__dirname, '../Backend/.env');
let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...vals] = trimmed.split('=');
    const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
    if ((key.trim() === 'MONGO_URI' || key.trim() === 'MONGODB_URI') && !mongoUri) {
      mongoUri = val;
    }
  }
}

if (!mongoUri) {
  console.error('[Verify] Error: No MONGO_URI found in Backend/.env or process.env');
  process.exit(1);
}

// Dynamically import mongoose from Backend/node_modules
import { pathToFileURL } from 'url';
const mongoosePath = path.resolve(__dirname, '../Backend/node_modules/mongoose/index.js');
const { default: mongoose } = await import(pathToFileURL(mongoosePath).href);

async function verifyAllPendingReports() {
  try {
    console.log('[Verify] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Verify] Connected successfully.');

    const collection = mongoose.connection.db.collection('reports');
    const pendingCount = await collection.countDocuments({ status: 'pending' });
    console.log(`[Verify] Found ${pendingCount} pending reports.`);

    if (pendingCount === 0) {
      console.log('[Verify] No pending reports to verify.');
    } else {
      const result = await collection.updateMany(
        { status: 'pending' },
        {
          $set: {
            status: 'verified',
            updatedAt: new Date(),
          },
        }
      );
      console.log(`[Verify] Successfully transitioned ${result.modifiedCount} reports to 'verified'!`);
    }

    // Print summary of reports by status
    const stats = await collection
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray();
    console.log('[Verify] Current reports breakdown:');
    stats.forEach((s) => console.log(`  - ${s._id}: ${s.count}`));
  } catch (err) {
    console.error('[Verify] Failed to verify reports:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Verify] Database connection closed.');
  }
}

verifyAllPendingReports();
