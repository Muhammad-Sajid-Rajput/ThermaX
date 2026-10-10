import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import Weather from '../models/Weather.js';
import WeatherSnapshot from '../models/WeatherSnapshot.js';
import { buildCacheKey } from '../services/weatherService.js';
import { runBackfill } from '../scripts/backfill-heatindex.js';

describe('Guarded Heat-Index Backfill (backfill-heatindex.js)', () => {
  const baseLat = 24.860;
  const baseLng = 67.010;
  const baseCacheKey = buildCacheKey(baseLat, baseLng);
  const now = new Date('2026-09-28T12:00:00.000Z');

  beforeEach(async () => {
    await Weather.deleteMany({});
    await WeatherSnapshot.deleteMany({});
    await Report.deleteMany({});
  });

  it('dry-run identifies match without mutating the database', async () => {
    // 1. Create a verified report without snapshot
    const report = await Report.create({
      status: 'verified',
      isSynthetic: false,
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    // 2. Create matching Weather cache record (1 hour later, within 3h window)
    const weatherObservedAt = new Date(now.getTime() + 60 * 60 * 1000);
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 43.5,
      temperature: 36.0,
      humidity: 55,
      observedAt: weatherObservedAt,
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    const stats = await runBackfill({ apply: false, hoursWindow: 3, logger: { log: () => {} } });

    expect(stats.isDryRun).toBe(true);
    expect(stats.filled).toBe(1);
    expect(stats.sampleMatches).toHaveLength(1);
    expect(stats.sampleMatches[0].heatIndex).toBe(43.5);

    // DB should NOT have mutated: no snapshot created, report ref untouched
    const reportAfter = await Report.findById(report._id);
    expect(reportAfter.weatherSnapshotRef).toBeUndefined();
    expect(await WeatherSnapshot.countDocuments()).toBe(0);
  });

  it('--apply persists new snapshot with provenance and links to report', async () => {
    const report = await Report.create({
      status: 'verified',
      isSynthetic: false,
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    const weatherObservedAt = new Date(now.getTime() + 30 * 60 * 1000);
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 44.2,
      temperature: 37.0,
      humidity: 60,
      observedAt: weatherObservedAt,
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    const stats = await runBackfill({ apply: true, hoursWindow: 3, logger: { log: () => {} } });

    expect(stats.isDryRun).toBe(false);
    expect(stats.filled).toBe(1);

    const reportAfter = await Report.findById(report._id);
    expect(reportAfter.weatherSnapshotRef).toBeDefined();

    const snapshot = await WeatherSnapshot.findById(reportAfter.weatherSnapshotRef);
    expect(snapshot).not.toBeNull();
    expect(snapshot.heatIndex).toBe(44.2);
    expect(snapshot.humidity).toBe(60);
    expect(snapshot.temperature).toBe(37.0);
    expect(snapshot.heatIndexSource).toBe('weather-cache-backfill');
    expect(snapshot.isSynthetic).toBe(false);
  });

  it('updates existing snapshot where heatIndex is null, but never overwrites existing heatIndex', async () => {
    // Report 1: has snapshot with heatIndex null -> should be filled
    const report1 = await Report.create({
      status: 'verified',
      isSynthetic: false,
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    const snap1 = await WeatherSnapshot.create({
      report: report1._id,
      heatIndex: null,
      temperature: 34.0,
    });
    report1.weatherSnapshotRef = snap1._id;
    await report1.save();

    // Report 2: has snapshot with existing heatIndex 41.0 -> MUST NOT be overwritten
    const report2 = await Report.create({
      status: 'verified',
      isSynthetic: false,
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    const snap2 = await WeatherSnapshot.create({
      report: report2._id,
      heatIndex: 41.0,
      temperature: 35.0,
    });
    report2.weatherSnapshotRef = snap2._id;
    await report2.save();

    // Cache record in the same cell
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 45.0,
      temperature: 38.0,
      observedAt: now,
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    const stats = await runBackfill({ apply: true, hoursWindow: 3, logger: { log: () => {} } });

    // snap1 should be updated
    const snap1After = await WeatherSnapshot.findById(snap1._id);
    expect(snap1After.heatIndex).toBe(45.0);
    expect(snap1After.heatIndexSource).toBe('weather-cache-backfill');

    // snap2 MUST be preserved at 41.0
    const snap2After = await WeatherSnapshot.findById(snap2._id);
    expect(snap2After.heatIndex).toBe(41.0);
    expect(snap2After.heatIndexSource).toBe('provider');
  });

  it('skips when Weather record is outside the ±3h window', async () => {
    const report = await Report.create({
      status: 'verified',
      isSynthetic: false,
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    // Weather record is 3 hours and 30 minutes away (> 3 hours)
    const tooLate = new Date(now.getTime() + 210 * 60 * 1000);
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 42.0,
      observedAt: tooLate,
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    const stats = await runBackfill({ apply: true, hoursWindow: 3, logger: { log: () => {} } });

    expect(stats.filled).toBe(0);
    expect(stats.skipped).toBe(1);
    expect(stats.skipReasons['no-cache-weather-match']).toBe(1);
  });

  it('skips unverified reports', async () => {
    // Unverified report (pending)
    await Report.create({
      status: 'pending',
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    // Unverified report (rejected)
    await Report.create({
      status: 'rejected',
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    // Matching weather record exists
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 42.0,
      observedAt: now,
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    const stats = await runBackfill({ apply: true, hoursWindow: 3, logger: { log: () => {} } });

    expect(stats.filled).toBe(0);
    expect(await WeatherSnapshot.countDocuments()).toBe(0);
  });

  it('picks closest match when multiple records are within time window', async () => {
    const report = await Report.create({
      status: 'verified',
      isSynthetic: false,
      latitude: baseLat,
      longitude: baseLng,
      snappedLocation: { lat: baseLat, lng: baseLng },
      observedAt: now,
    });

    // Weather 1: 2 hours away
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 40.0,
      observedAt: new Date(now.getTime() - 120 * 60 * 1000),
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    // Weather 2: 15 minutes away (closest)
    await Weather.create({
      coordinates: { lat: baseLat, lng: baseLng },
      cacheKey: baseCacheKey,
      heatIndex: 44.5,
      observedAt: new Date(now.getTime() + 15 * 60 * 1000),
      geoPoint: { type: 'Point', coordinates: [baseLng, baseLat] },
    });

    const stats = await runBackfill({ apply: true, hoursWindow: 3, logger: { log: () => {} } });

    expect(stats.filled).toBe(1);
    const snap = await WeatherSnapshot.findOne({ report: report._id });
    expect(snap.heatIndex).toBe(44.5);
  });
});
