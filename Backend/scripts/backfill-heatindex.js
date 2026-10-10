#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import Report from '../models/Report.js';
import Weather from '../models/Weather.js';
import WeatherSnapshot from '../models/WeatherSnapshot.js';
import { buildCacheKey } from '../services/weatherService.js';

/**
 * Guarded Heat-Index Backfill Engine
 *
 * Scans:
 *  1. WeatherSnapshots where heatIndex is null
 *  2. Verified reports with no weather snapshot at all
 *
 * Matches against real Weather cache records:
 *  - Exact cacheKey grid cell match (buildCacheKey(lat, lng) on snappedLocation)
 *  - Time proximity: Weather observedAt within ±hoursWindow of report observedAt
 *  - Verified reports only
 *  - Never overwrites existing non-null heatIndex
 *  - Provenance: stamped with heatIndexSource: 'weather-cache-backfill'
 */
export async function runBackfill(options = {}) {
  const {
    apply = false,
    hoursWindow = 3,
    strictObservedAt = false,
    logger = console,
  } = options;

  const isDryRun = !apply;
  const windowMs = hoursWindow * 60 * 60 * 1000;

  const stats = {
    isDryRun,
    hoursWindow,
    scannedSnapshots: 0,
    scannedReportsWithoutSnapshot: 0,
    totalScanned: 0,
    filled: 0,
    skipped: 0,
    skipReasons: {},
    sampleMatches: [],
  };

  function recordSkip(reason) {
    stats.skipped++;
    stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
  }

  // -------------------------------------------------------------------------
  // PASS 1: Existing WeatherSnapshots with heatIndex == null
  // -------------------------------------------------------------------------
  const nullSnapshots = await WeatherSnapshot.find({
    $or: [{ heatIndex: null }, { heatIndex: { $exists: false } }],
  });

  for (const snapshot of nullSnapshots) {
    stats.scannedSnapshots++;
    stats.totalScanned++;

    const report = await Report.findById(snapshot.report);
    if (!report) {
      recordSkip('report-not-found');
      continue;
    }
    if (report.status !== 'verified') {
      recordSkip('unverified-report');
      continue;
    }

    const lat = report.snappedLocation?.lat ?? report.latitude;
    const lng = report.snappedLocation?.lng ?? report.longitude;
    if (lat == null || lng == null) {
      recordSkip('missing-location');
      continue;
    }

    const reportTime = report.observedAt
      ? new Date(report.observedAt)
      : (!strictObservedAt && report.createdAt ? new Date(report.createdAt) : null);

    if (!reportTime || isNaN(reportTime.getTime())) {
      recordSkip('missing-observed-at');
      continue;
    }

    const cacheKey = buildCacheKey(lat, lng);
    const minTime = new Date(reportTime.getTime() - windowMs);
    const maxTime = new Date(reportTime.getTime() + windowMs);

    const matches = await Weather.find({
      cacheKey,
      observedAt: { $gte: minTime, $lte: maxTime },
      heatIndex: { $ne: null },
    }).lean();

    if (!matches || matches.length === 0) {
      recordSkip('no-cache-weather-match');
      continue;
    }

    // Pick the closest weather observation in time
    matches.sort((a, b) => {
      const diffA = Math.abs(new Date(a.observedAt).getTime() - reportTime.getTime());
      const diffB = Math.abs(new Date(b.observedAt).getTime() - reportTime.getTime());
      return diffA - diffB;
    });

    const best = matches[0];
    const deltaMinutes = Math.round(
      Math.abs(new Date(best.observedAt).getTime() - reportTime.getTime()) / 60000
    );

    if (stats.sampleMatches.length < 5) {
      stats.sampleMatches.push({
        type: 'update-snapshot',
        reportId: String(report._id),
        snapshotId: String(snapshot._id),
        cacheKey,
        reportObservedAt: reportTime.toISOString(),
        weatherObservedAt: new Date(best.observedAt).toISOString(),
        deltaMinutes,
        heatIndex: best.heatIndex,
        humidity: best.humidity ?? null,
      });
    }

    if (!isDryRun) {
      snapshot.heatIndex = best.heatIndex;
      if (snapshot.humidity == null && best.humidity != null) {
        snapshot.humidity = best.humidity;
      }
      if (snapshot.temperature == null && best.temperature != null) {
        snapshot.temperature = best.temperature;
      }
      snapshot.heatIndexSource = 'weather-cache-backfill';
      await snapshot.save();
    }

    stats.filled++;
  }

  // -------------------------------------------------------------------------
  // PASS 2: Verified reports with NO snapshot at all
  // -------------------------------------------------------------------------
  const reportsWithoutSnapshot = await Report.find({
    status: 'verified',
    $or: [
      { weatherSnapshotRef: null },
      { weatherSnapshotRef: { $exists: false } },
    ],
  });

  for (const report of reportsWithoutSnapshot) {
    stats.scannedReportsWithoutSnapshot++;
    stats.totalScanned++;

    // Safety: check if snapshot already exists in WeatherSnapshot collection
    const existingSnap = await WeatherSnapshot.findOne({ report: report._id });
    if (existingSnap) {
      if (existingSnap.heatIndex != null) {
        recordSkip('snapshot-already-has-heatindex');
        continue;
      }
      recordSkip('snapshot-handled-in-pass1');
      continue;
    }

    const lat = report.snappedLocation?.lat ?? report.latitude;
    const lng = report.snappedLocation?.lng ?? report.longitude;
    if (lat == null || lng == null) {
      recordSkip('missing-location');
      continue;
    }

    const reportTime = report.observedAt
      ? new Date(report.observedAt)
      : (!strictObservedAt && report.createdAt ? new Date(report.createdAt) : null);

    if (!reportTime || isNaN(reportTime.getTime())) {
      recordSkip('missing-observed-at');
      continue;
    }

    const cacheKey = buildCacheKey(lat, lng);
    const minTime = new Date(reportTime.getTime() - windowMs);
    const maxTime = new Date(reportTime.getTime() + windowMs);

    const matches = await Weather.find({
      cacheKey,
      observedAt: { $gte: minTime, $lte: maxTime },
      heatIndex: { $ne: null },
    }).lean();

    if (!matches || matches.length === 0) {
      recordSkip('no-cache-weather-match');
      continue;
    }

    matches.sort((a, b) => {
      const diffA = Math.abs(new Date(a.observedAt).getTime() - reportTime.getTime());
      const diffB = Math.abs(new Date(b.observedAt).getTime() - reportTime.getTime());
      return diffA - diffB;
    });

    const best = matches[0];
    const deltaMinutes = Math.round(
      Math.abs(new Date(best.observedAt).getTime() - reportTime.getTime()) / 60000
    );

    if (stats.sampleMatches.length < 5) {
      stats.sampleMatches.push({
        type: 'create-snapshot',
        reportId: String(report._id),
        cacheKey,
        reportObservedAt: reportTime.toISOString(),
        weatherObservedAt: new Date(best.observedAt).toISOString(),
        deltaMinutes,
        heatIndex: best.heatIndex,
        humidity: best.humidity ?? null,
      });
    }

    if (!isDryRun) {
      const newSnapshot = await WeatherSnapshot.create({
        report: report._id,
        heatIndex: best.heatIndex,
        humidity: best.humidity ?? null,
        temperature: best.temperature ?? null,
        windSpeed: best.windKph != null ? Number((best.windKph / 3.6).toFixed(1)) : null,
        uvIndex: best.uv ?? null,
        weatherCondition: best.condition ?? null,
        source: best.source || 'weatherapi',
        heatIndexSource: 'weather-cache-backfill',
        isSynthetic: false,
        fetchedAt: new Date(),
        observedAt: best.observedAt || reportTime,
      });

      report.weatherSnapshotRef = newSnapshot._id;
      await report.save();
    }

    stats.filled++;
  }

  // -------------------------------------------------------------------------
  // Output Summary
  // -------------------------------------------------------------------------
  logger.log('\n======================================================================');
  logger.log('  ThermaX Guarded Heat-Index Backfill Summary');
  logger.log('======================================================================');
  logger.log(`  Mode:           ${isDryRun ? 'DRY-RUN (no changes written to DB)' : 'APPLIED (changes persisted to DB)'}`);
  logger.log(`  Time Window:    ±${hoursWindow} hours`);
  logger.log(`  Total Scanned:  ${stats.totalScanned} (Null Snapshots: ${stats.scannedSnapshots}, Snapshotless Reports: ${stats.scannedReportsWithoutSnapshot})`);
  logger.log(`  Total Filled:   ${stats.filled}`);
  logger.log(`  Total Skipped:  ${stats.skipped}`);
  
  if (Object.keys(stats.skipReasons).length > 0) {
    logger.log('\n  Skip Reasons Breakdown:');
    for (const [reason, count] of Object.entries(stats.skipReasons)) {
      logger.log(`    - ${reason}: ${count}`);
    }
  }

  if (stats.sampleMatches.length > 0) {
    logger.log('\n  Sample Matches (first ' + stats.sampleMatches.length + '):');
    stats.sampleMatches.forEach((m, idx) => {
      logger.log(
        `    ${idx + 1}. [${m.type}] Report: ${m.reportId} | Cell: ${m.cacheKey} | Δ ${m.deltaMinutes}m | HeatIndex: ${m.heatIndex}°C | Hum: ${m.humidity != null ? m.humidity + '%' : 'N/A'}`
      );
    });
  }
  logger.log('======================================================================\n');

  return stats;
}

// ---------------------------------------------------------------------------
// CLI Execution Entrypoint
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const strictObservedAt = args.includes('--strict-observed-at');

  let hoursWindow = 3;
  const hoursArgIdx = args.findIndex((a) => a === '--hours' || a === '--window');
  if (hoursArgIdx !== -1 && args[hoursArgIdx + 1]) {
    hoursWindow = parseFloat(args[hoursArgIdx + 1]) || 3;
  } else {
    const inlineArg = args.find((a) => a.startsWith('--hours=') || a.startsWith('--window='));
    if (inlineArg) {
      hoursWindow = parseFloat(inlineArg.split('=')[1]) || 3;
    }
  }

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/thermax';

  await mongoose.connect(mongoUri);

  try {
    await runBackfill({
      apply,
      hoursWindow,
      strictObservedAt,
      logger: console,
    });
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal backfill error:', err);
    process.exit(1);
  });
}
