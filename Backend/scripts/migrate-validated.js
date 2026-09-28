/**
 * One-shot migration: normalize pre-Phase-3 report statuses to the Phase 3
 * lifecycle vocabulary.
 *
 *   validated -> verified
 *   anomaly   -> flagged
 *
 * Idempotent: re-running after a successful migration matches zero documents.
 *
 * SAFETY: this script only applies changes when invoked with `--apply`.
 * Without the flag it performs a dry run that prints what WOULD change.
 * It is never invoked at boot.
 *
 * Usage:
 *   node scripts/migrate-validated.js            # dry run
 *   node scripts/migrate-validated.js --apply    # apply the migration
 *
 * Env: MONGO_URI (default mongodb://localhost:27017/thermax)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LEGACY_MAPPINGS = [
  { from: 'validated', to: 'verified' },
  { from: 'anomaly', to: 'flagged' },
];

async function main() {
  const apply = process.argv.includes('--apply');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';
  await mongoose.connect(mongoUri);
  console.log(`Connected to ${mongoUri}`);

  const reports = mongoose.connection.collection('reports');

  const plan = [];
  for (const { from, to } of LEGACY_MAPPINGS) {
    const count = await reports.countDocuments({ status: from });
    plan.push({ from, to, count });
  }

  if (!apply) {
    console.log('\nDRY RUN — no changes applied. Re-run with --apply to migrate:');
    for (const { from, to, count } of plan) {
      console.log(`  status '${from}' -> '${to}': ${count} document(s)`);
    }
    console.log('\nNothing was modified.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('\nApplying migration:');
  let total = 0;
  for (const { from, to } of LEGACY_MAPPINGS) {
    const result = await reports.updateMany({ status: from }, { $set: { status: to } });
    console.log(`  status '${from}' -> '${to}': ${result.modifiedCount} document(s) updated`);
    total += result.modifiedCount;
  }
  console.log(`\nMigration complete: ${total} document(s) updated.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
