/**
 * One-shot migration: rename legacy `pdfUrl` -> `exportUrl` on
 * GeneratedReport documents.
 *
 * Background: pre-remediation exports were HTML briefings saved with a
 * `.pdf` extension and recorded under `pdfUrl` — a dishonest name, since no
 * real PDF engine exists (format=pdf now returns 400). The schema was
 * renamed to `exportUrl`; this script carries old documents forward so
 * previously generated exports remain listed and downloadable.
 *
 * Only documents that have `pdfUrl` and lack `exportUrl` are touched.
 * Idempotent: re-running after a successful migration matches zero documents.
 *
 * SAFETY: this script only applies changes when invoked with `--apply`.
 * Without the flag it performs a dry run that prints what WOULD change.
 * It is never invoked at boot.
 *
 * Usage:
 *   node scripts/migrate-pdfurl.js            # dry run
 *   node scripts/migrate-pdfurl.js --apply    # apply the migration
 *
 * Env: MONGO_URI (default mongodb://localhost:27017/thermax)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apply = process.argv.includes('--apply');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';
  await mongoose.connect(mongoUri);
  console.log(`Connected to ${mongoUri}`);

  const collection = mongoose.connection.collection('generatedreports');
  const filter = {
    pdfUrl: { $exists: true },
    exportUrl: { $exists: false },
  };

  const count = await collection.countDocuments(filter);

  if (!apply) {
    console.log('\nDRY RUN — no changes applied. Re-run with --apply to migrate:');
    console.log(`  pdfUrl -> exportUrl: ${count} document(s)`);
    const sample = await collection.find(filter, { projection: { pdfUrl: 1 } }).limit(3).toArray();
    for (const doc of sample) {
      console.log(`    sample _id=${doc._id} pdfUrl=${doc.pdfUrl}`);
    }
    console.log('\nNothing was modified.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('\nApplying migration:');
  const result = await collection.updateMany(filter, [
    { $set: { exportUrl: '$pdfUrl' } },
    { $unset: 'pdfUrl' },
  ]);
  console.log(`  pdfUrl -> exportUrl: ${result.modifiedCount} document(s) updated`);
  console.log('\nMigration complete.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
