import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';
import GeneratedReport from '../models/GeneratedReport.js';
import { generateAccessToken } from '../utils/jwt.js';

async function makeAdmin(tag) {
  const user = await User.create({
    name: `DashAdmin ${tag}`,
    email: `dash-admin-${tag}@dash.test`,
    password: 'Str0ng!Passw0rd',
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });
  return generateAccessToken(user._id, user.role);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dashboard snapshot — real trend aggregation', () => {
  it('returns 7 day buckets with real per-day counts that sum to the seeded total', async () => {
    const now = Date.now();
    const seedDates = [
      new Date(now), // today
      new Date(now), // today
      new Date(now - 26 * 3600 * 1000), // yesterday-ish
      new Date(now - 50 * 3600 * 1000), // two days back
    ];
    for (const createdAt of seedDates) {
      await Report.create({
        latitude: 24.86,
        longitude: 67.0,
        severityLevel: 3,
        city: 'Karachi',
        status: 'pending',
        createdAt,
      });
    }

    const res = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res.status).toBe(200);

    const { trend } = res.body.charts;
    expect(trend).toHaveLength(7);

    // Buckets are real calendar days: the sum equals exactly what we seeded.
    const total = trend.reduce((sum, bucket) => sum + bucket.reports, 0);
    expect(total).toBe(seedDates.length);

    // Labels are the actual weekdays of those 7 days in chronological
    // order — not a hardcoded Mon..Sun sequence assigned by index.
    const expectedLabels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      expectedLabels.push(d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }));
    }
    expect(trend.map((b) => b.label)).toEqual(expectedLabels);

    // A day with no reports is zero-filled, never a fake 1.
    expect(trend.some((b) => b.reports === 0)).toBe(true);
  });

  it('counts verified (not legacy validated) reports', async () => {
    await Report.create({ latitude: 24.86, longitude: 67.0, severityLevel: 2, city: 'Karachi', status: 'verified' });
    await Report.create({ latitude: 24.86, longitude: 67.0, severityLevel: 2, city: 'Karachi', status: 'pending' });

    const res = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res.status).toBe(200);
    expect(res.body.approvedReports).toBe(1);
  });

  it('derives systemHealth from the live DB connection', async () => {
    const res = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res.status).toBe(200);
    expect(res.body.systemHealth).toBe('operational');
  });
});

describe('hotspots — no fabricated confidence', () => {
  it('omits the confidence field entirely', async () => {
    await Hotspot.create({
      clusterId: 'c-1',
      city: 'Karachi',
      centroid: { lat: 24.86, lng: 67.0 },
      severity: 'high',
      status: 'active',
      reportCount: 5,
      runId: 'test-run-1',
    });
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'test-run-1' });

    const res = await request(app).get('/api/v1/hotspots');
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(1);
    expect('confidence' in res.body.hotspots[0]).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('0.85');
  });

  it('serves only the pointer-referenced current run, ranked by TVI', async () => {
    await Hotspot.create({
      clusterId: 'c-old', city: 'Karachi', centroid: { lat: 24.86, lng: 67.0 },
      severity: 'high', status: 'active', reportCount: 5,
      runId: 'run-old', tvi: 0.9,
    });
    await Hotspot.create({
      clusterId: 'c-new-low', city: 'Karachi', centroid: { lat: 24.87, lng: 67.01 },
      severity: 'moderate', status: 'active', reportCount: 4,
      runId: 'run-new', tvi: 0.4,
    });
    await Hotspot.create({
      clusterId: 'c-new-high', city: 'Karachi', centroid: { lat: 24.88, lng: 67.02 },
      severity: 'critical', status: 'active', reportCount: 9,
      runId: 'run-new', tvi: 0.85,
    });
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-new' });

    const res = await request(app).get('/api/v1/hotspots?city=Karachi');
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(2);
    // Superseded run invisible; current run ranked by TVI, not insert order.
    expect(res.body.hotspots.map((h) => h.clusterId)).toEqual(['c-new-high', 'c-new-low']);
    expect(res.body.hotspots[0].tvi).toBeCloseTo(0.85);
  });

  it('returns 400 for an unknown city and empty for a city with no run yet', async () => {
    const bad = await request(app).get('/api/v1/hotspots?city=Atlantis');
    expect(bad.status).toBe(400);
    const empty = await request(app).get('/api/v1/hotspots?city=Lahore');
    expect(empty.status).toBe(200);
    expect(empty.body.hotspots).toEqual([]);
  });

  it('survives a writer crash mid-publication: readers keep seeing the old complete run', async () => {
    // Run A is published and current (real MongoDB, not a mock).
    await Hotspot.create({
      clusterId: 'c-a', city: 'Karachi', centroid: { lat: 24.86, lng: 67.0 },
      severity: 'high', status: 'active', reportCount: 5, runId: 'run-A', tvi: 0.7,
    });
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-A' });

    // The writer dies AFTER inserting run B but BEFORE flipping the pointer.
    await Hotspot.create({
      clusterId: 'c-b', city: 'Karachi', centroid: { lat: 24.87, lng: 67.01 },
      severity: 'critical', status: 'active', reportCount: 8, runId: 'run-B', tvi: 0.95,
    });

    // Readers are unaffected: the unreferenced run B is invisible.
    const during = await request(app).get('/api/v1/hotspots?city=Karachi');
    expect(during.status).toBe(200);
    expect(during.body.hotspots).toHaveLength(1);
    expect(during.body.hotspots[0].clusterId).toBe('c-a');

    // The writer recovers and flips the pointer: readers now see run B whole.
    await HotspotPublication.updateOne(
      { city: 'Karachi' },
      { $set: { currentRunId: 'run-B', previousRunId: 'run-A' } }
    );
    const after = await request(app).get('/api/v1/hotspots?city=Karachi');
    expect(after.body.hotspots).toHaveLength(1);
    expect(after.body.hotspots[0].clusterId).toBe('c-b');
  });

  it('accepts the ML-emitted unknown severity and requires a city', async () => {
    const unknown = await Hotspot.create({
      clusterId: 'c-2',
      city: 'Lahore',
      centroid: { lat: 31.5, lng: 74.3 },
      severity: 'unknown',
      status: 'active',
    });
    expect(unknown.severity).toBe('unknown');

    // A missing city fails validation instead of silently becoming Karachi.
    await expect(
      Hotspot.create({ clusterId: 'c-3', centroid: { lat: 24.86, lng: 67.0 }, severity: 'high' })
    ).rejects.toThrow();
  });
});

describe('export history — DB failure is 503, not a fake empty list', () => {
  it('returns 503 when the database is unreachable', async () => {
    const token = await makeAdmin('hist503');
    const dbErr = new Error('connection timed out');
    dbErr.name = 'MongooseError';
    vi.spyOn(GeneratedReport, 'find').mockReturnValueOnce({
      sort: () => Promise.reject(dbErr),
    });

    const res = await request(app)
      .get('/api/v1/exports/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/unavailable/i);
  });
});
