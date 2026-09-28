// Phase 5 backfill: attribute legacy reports that have no city.
//
// Reports submitted before server-side city resolution carry no `city`.
// This script resolves each one from its coordinates against the canonical
// city polygons (Backend/data/cities.json) and sets it. Reports whose
// coordinates fall outside every supported city are left untouched and
// listed — they stay excluded from per-city clustering rather than being
// misattributed.
//
// Usage: node scripts/backfillCity.js [--dry-run]
import mongoose from 'mongoose';
import { resolveCity } from '../services/boundaryService.js';
import Report from '../models/Report.js';

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(MONGO_URI);
  const cursor = Report.find({
    $or: [{ city: null }, { city: { $exists: false } }, { city: '' }],
  }).cursor();

  let attributed = 0;
  let unresolvable = 0;
  const unresolvableIds = [];
  for await (const report of cursor) {
    const lat = report.latitude ?? report.location?.lat;
    const lng = report.longitude ?? report.location?.lng;
    const city = lat != null && lng != null ? resolveCity(lat, lng) : null;
    if (city) {
      attributed += 1;
      if (!dryRun) {
        await Report.updateOne({ _id: report._id }, { $set: { city } });
      }
    } else {
      unresolvable += 1;
      if (unresolvableIds.length < 20) unresolvableIds.push(String(report._id));
    }
  }
  console.log(
    `[backfillCity] ${dryRun ? 'DRY RUN — ' : ''}attributed: ${attributed}, ` +
      `unresolvable (left city-less): ${unresolvable}`
  );
  if (unresolvableIds.length) {
    console.log(
      `[backfillCity] sample unresolvable ids: ${unresolvableIds.join(', ')}`
    );
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[backfillCity] failed:', err.message);
  process.exit(1);
});
