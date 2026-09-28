/**
 * Phase 8 demo enrichment — synthetic weather for the seeded demo dataset.
 *
 * The seed script (`npm run seed`) creates reports WITHOUT weather
 * snapshots, and QC's environmental-evidence policy refuses to verify a
 * report on GPS plausibility alone. On a machine with no weather/GEE API
 * keys, the pipeline would therefore flag every seeded report and the demo
 * would show zero hotspots.
 *
 * This script closes that gap DETERMINISTICALLY and HONESTLY:
 *  - one weather snapshot per synthetic report, with `isSynthetic: true`
 *    and `source: 'demo-seed'` — never mistaken for real provider data;
 *  - the snapshot temperature tracks the report's citizen reading within
 *    ±1.0 °C (inside QC's ±3 °C tolerance), so QC can genuinely pass on
 *    the seeded data;
 *  - snapshots are linked via `weatherSnapshotRef`, the same field the
 *    production submit path fills.
 *
 * Honest-data contract: every row this script writes is marked synthetic,
 * the public pipeline excludes synthetic data unless the deliberate demo
 * opt-in `INCLUDE_SYNTHETIC_REPORTS=true` is set (which `scripts/demo.sh`
 * sets explicitly), and `README.md` states plainly that the
 * demo runs on synthetic weather. In production this data comes from the
 * weather provider, not from this script.
 *
 * Idempotent: reruns upsert the same snapshots (unique index on `report`).
 *
 * Usage:  node scripts/demo-enrich.js
 * Env:    MONGO_URI (default mongodb://localhost:27017/thermax)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { WeatherSnapshot } from '../models/WeatherSnapshot.js';
import { Report } from '../models/Report.js';

dotenv.config();

// Seeded RNG (mulberry32) — same deterministic demo dataset on every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260928);

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/thermax';
  await mongoose.connect(mongoUri);
  console.log(`Connected to ${mongoUri}`);

  const reports = await Report.find({ isSynthetic: true }).select(
    '_id ambientTemp temperature'
  );
  console.log(`Found ${reports.length} synthetic reports.`);

  let linked = 0;
  const now = new Date();
  for (const r of reports) {
    const citizenTemp = r.ambientTemp ?? r.temperature;
    if (citizenTemp == null) continue;

    // Within ±1.0 °C of the citizen reading: inside QC's ±3 °C tolerance,
    // so the seeded reports genuinely pass check 1 (no special-casing).
    const temperature = Math.round((citizenTemp + (rand() * 2 - 1) * 1.0) * 10) / 10;
    const heatIndex = Math.round((temperature + 2 + rand() * 3) * 10) / 10;

    const snap = await WeatherSnapshot.findOneAndUpdate(
      { report: r._id },
      {
        $set: {
          temperature,
          heatIndex,
          source: 'demo-seed',
          isSynthetic: true,
          fetchedAt: now,
          observedAt: now,
        },
      },
      { upsert: true, new: true }
    );
    await Report.updateOne(
      { _id: r._id },
      { $set: { weatherSnapshotRef: snap._id } }
    );
    linked++;
  }

  console.log(`Linked ${linked} synthetic weather snapshots (source=demo-seed).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Demo enrichment failed:', err);
  process.exit(1);
});
