/**
 * Regression tests for the pre-Phase-5 review fixes:
 *
 * 1. CSV export neutralizes spreadsheet formula injection (=, +, -, @).
 * 2. Export format contract is honest: 'pdf' -> 400 (PDF not implemented),
 *    default format is 'html' and the response says so.
 * 3. GET /reports populates reporter name/email for admins only —
 *    public callers get no PII.
 * 4. /heatmap excludes reports without a severity (no invented 3).
 * 5. GET /users/:id role check is case-insensitive.
 * 6. aggregateReportData() no longer defaults to Karachi.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import { generateAccessToken } from '../utils/jwt.js';
import { generateCSV } from '../services/csvExporterService.js';
import { aggregateReportData } from '../services/reportAggregationService.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';

async function makeUser(role, tag) {
  const user = await User.create({
    name: tag,
    email: `${tag}@honestyfix.test`,
    password: 'Str0ng!Passw0rd',
    role,
    isEmailVerified: true,
  });
  return { user, token: generateAccessToken(user._id, user.role) };
}

function makeReport(userId, overrides = {}) {
  return Report.create({
    user: userId,
    latitude: 24.86,
    longitude: 67.0,
    severityLevel: 4,
    city: 'Karachi',
    status: 'pending',
    ...overrides,
  });
}

describe('CSV export — formula-injection guard', () => {
  it("neutralizes =, +, - and @ prefixes in free-text cells", () => {
    const csv = generateCSV({
      reports: [
        {
          reportRef: 'HTX-1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          district: '=cmd|/c calc',
          city: '+Karachi',
          latitude: 24.86,
          longitude: 67.0,
          severityLevel: 4,
          ambientTemp: 39.5,
          category: '@urban_heat_island',
          status: '-pending',
        },
      ],
    });
    const row = csv.split('\n')[1];
    expect(row).toContain(`"'=cmd|/c calc"`);
    expect(row).toContain(`"'+Karachi"`);
    expect(row).toContain(`"'@urban_heat_island"`);
    expect(row).toContain(`"'-pending"`);
    // No raw formula-prefix cell survives: every quoted text cell that
    // starts with a dangerous char must be quote-prefixed.
    for (const cell of row.split(',')) {
      const inner = cell.replace(/^"|"$/g, '');
      expect(/^[=+\-@]/.test(inner)).toBe(false);
    }
  });

  it('leaves plain values untouched', () => {
    const csv = generateCSV({
      reports: [
        {
          reportRef: 'HTX-2',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          district: 'Korangi',
          city: 'Karachi',
          latitude: 24.86,
          longitude: 67.0,
          severityLevel: 4,
          category: 'urban_heat_island',
          status: 'pending',
        },
      ],
    });
    expect(csv).toContain('"Korangi"');
    expect(csv).not.toContain(`"'Korangi"`);
  });
});

describe('export format — honest contract', () => {
  it("rejects format 'pdf' with 400 instead of silently serving HTML", async () => {
    const admin = await makeUser(ROLES.ADMIN, 'pdfreject');
    const res = await request(app)
      .post('/api/v1/exports/generate')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ city: 'Karachi', format: 'pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not implemented/i);
  });

  it('defaults to html and says so in the response', async () => {
    const admin = await makeUser(ROLES.ADMIN, 'htmldefault');
    const res = await request(app)
      .post('/api/v1/exports/generate')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ city: 'Karachi' });
    expect(res.status).toBe(201);
    expect(res.body.format).toBe('html');
    expect(res.body.downloadUrl).toMatch(/\.html$/);
  });
});

describe('GET /reports — reporter PII is admin-only', () => {
  it('public callers get no populated reporter; admins do', async () => {
    const admin = await makeUser(ROLES.ADMIN, 'piiadmin');
    const citizen = await makeUser(ROLES.USER, 'piicitizen');
    const created = await makeReport(citizen.user._id, { city: 'PiiCity' });
    const id = String(created._id);

    const pub = await request(app).get('/api/v1/reports');
    expect(pub.status).toBe(200);
    // The public endpoint returns a safe DTO keyed by `id` (not `_id`):
    // snapped location only, never exact GPS or reporter identity.
    const pubReport = pub.body.reports.find((r) => String(r.id) === id);
    expect(pubReport).toBeDefined();
    expect(pubReport.user).toBeUndefined();
    expect(pubReport.userId).toBeUndefined();
    expect(pubReport.latitude).toBeUndefined();
    expect(pubReport.coordinates).toBeUndefined();
    expect(pubReport.location).toBeDefined();
    expect(JSON.stringify(pubReport)).not.toContain('piicitizen@honestyfix.test');

    const asAdmin = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(asAdmin.status).toBe(200);
    const adminReport = asAdmin.body.reports.find((r) => String(r._id) === id);
    expect(adminReport.user.email).toBe('piicitizen@honestyfix.test');
    expect(adminReport.user.name).toBe('piicitizen');
  });
});

describe('/heatmap — no invented severity', () => {
  it('excludes reports without a severity instead of defaulting to 3', async () => {
    const citizen = await makeUser(ROLES.USER, 'hmcitizen');
    const withSev = await makeReport(citizen.user._id, {
      latitude: 24.8611,
      longitude: 67.0011,
      snappedLocation: { lat: 24.861, lng: 67.001 },
      severityLevel: 5,
      city: 'HeatCity',
    });
    // Severity-less report created directly (route validation requires
    // severity, but legacy rows may lack it).
    const noSev = await Report.create({
      user: citizen.user._id,
      latitude: 24.8699,
      longitude: 67.0099,
      snappedLocation: { lat: 24.87, lng: 67.01 },
      city: 'HeatCity',
      status: 'pending',
    });
    expect(noSev.severityLevel).toBeUndefined();

    const res = await request(app).get('/api/v1/heatmap?city=HeatCity');
    expect(res.status).toBe(200);
    const missing = res.body.heatmap.filter((p) => p.lat === 24.87);
    expect(missing).toHaveLength(0);
    const present = res.body.heatmap.find((p) => p.lat === 24.861);
    expect(present.intensity).toBe(1); // 5/5, real severity only
    await withSev.deleteOne();
    await noSev.deleteOne();
  });

  it('plots snapped grid points (never exact GPS), and excludes flagged + synthetic rows', async () => {
    const citizen = await makeUser(ROLES.USER, 'hmcitizen2');
    const exactLat = 24.86234;
    const exactLng = 67.00287;
    const real = await makeReport(citizen.user._id, {
      latitude: exactLat,
      longitude: exactLng,
      snappedLocation: { lat: 24.862, lng: 67.003 },
      severityLevel: 4,
      city: 'HeatCity2',
    });
    const flagged = await makeReport(citizen.user._id, {
      latitude: 24.86333,
      longitude: 67.00444,
      snappedLocation: { lat: 24.863, lng: 67.004 },
      severityLevel: 5,
      city: 'HeatCity2',
      status: 'flagged',
    });
    const synthetic = await makeReport(citizen.user._id, {
      latitude: 24.86444,
      longitude: 67.00555,
      snappedLocation: { lat: 24.864, lng: 67.006 },
      severityLevel: 5,
      city: 'HeatCity2',
      isSynthetic: true,
    });

    const res = await request(app).get('/api/v1/heatmap?city=HeatCity2');
    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body.heatmap);
    // Exact citizen GPS must never appear on the public heatmap.
    expect(raw).not.toContain(String(exactLat));
    expect(raw).not.toContain(String(exactLng));
    // Snapped point of the real report is plotted…
    expect(res.body.heatmap.find((p) => p.lat === 24.862 && p.lng === 67.003)).toBeDefined();
    // …but flagged and synthetic rows are not.
    expect(res.body.heatmap.find((p) => p.lat === 24.863)).toBeUndefined();
    expect(res.body.heatmap.find((p) => p.lat === 24.864)).toBeUndefined();
    await real.deleteOne();
    await flagged.deleteOne();
    await synthetic.deleteOne();
  });
});

describe('GET /users/:id — case-insensitive role check', () => {
  it("treats a mixed-case role as admin (consistent with authorize())", async () => {
    const a = await makeUser(ROLES.USER, 'casea');
    const b = await makeUser(ROLES.USER, 'caseb');
    // Bypass Mongoose enum validation to plant a mixed-case role, the way
    // a legacy DB row could hold one.
    await User.collection.updateOne(
      { _id: a.user._id },
      { $set: { role: 'Admin' } }
    );
    const res = await request(app)
      .get(`/api/v1/users/${b.user._id}`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(res.status).toBe(200);
    expect(String(res.body.user._id)).toBe(String(b.user._id));
  });
});

describe('aggregateReportData — no Karachi default', () => {
  it('scopes to nothing when no city is given (never silently Karachi)', async () => {
    const citizen = await makeUser(ROLES.USER, 'aggcitizen');
    await makeReport(citizen.user._id, { city: 'Karachi' });
    await makeReport(citizen.user._id, {
      city: 'Lahore',
      latitude: 31.5,
      longitude: 74.3,
    });

    const all = await aggregateReportData({});
    const khi = await aggregateReportData({ city: 'Karachi' });
    expect(all.city).toBeUndefined();
    expect(all.totalReports).toBeGreaterThan(khi.totalReports);
  });
});

describe('aggregateReportData — synthetic exclusion (no-fabrication policy)', () => {
  it('excludes synthetic rows by default; includes them only on deliberate opt-in', async () => {
    const citizen = await makeUser(ROLES.USER, 'synthcitizen');
    await makeReport(citizen.user._id, { city: 'Karachi', isSynthetic: true });
    await makeReport(citizen.user._id, { city: 'Karachi', isSynthetic: false });

    const def = await aggregateReportData({ city: 'Karachi' });
    const withSynth = await aggregateReportData({ city: 'Karachi', includeSynthetic: true });
    expect(withSynth.totalReports).toBe(def.totalReports + 1);
    expect(def.reports.every((r) => !r.isSynthetic)).toBe(true);
  });
});

describe('/dashboard/snapshot — synthetic rows excluded from KPIs by default', () => {
  it('counts real reports only; synthetic rows appear solely in syntheticReports', async () => {
    const citizen = await makeUser(ROLES.USER, 'dashcitizen');
    const real = await makeReport(citizen.user._id, { city: 'DashCity' });
    const synth = await makeReport(citizen.user._id, { city: 'DashCity', isSynthetic: true });

    const res = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res.status).toBe(200);

    // The real report is counted; the synthetic one is not in any KPI…
    expect(res.body.totalReports).toBeGreaterThanOrEqual(1);
    const trendTotal = res.body.charts.trend.reduce((a, b) => a + b.reports, 0);
    expect(trendTotal).toBeGreaterThanOrEqual(1);
    // …it is visible only via its dedicated honest count.
    expect(res.body.syntheticReports).toBeGreaterThanOrEqual(1);

    // The synthetic report alone must not inflate the totals: delete the
    // real one and the KPI delta must be exactly 1.
    await real.deleteOne();
    const res2 = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res2.body.totalReports).toBe(res.body.totalReports - 1);
    await synth.deleteOne();
  });
});

describe('aggregateReportData — pointer-aware hotspot read (stale-run-blind fix)', () => {
  it('excludes previous-run hotspots from activeHotspotsCount and hotspot output', async () => {
    // Pipeline retains the superseded run alongside the current one.
    await Hotspot.create({
      clusterId: 'agg-old',
      city: 'Karachi',
      centroid: { lat: 24.86, lng: 67.0 },
      severity: 'high',
      status: 'active',
      runId: 'run-old',
    });
    await Hotspot.create({
      clusterId: 'agg-new',
      city: 'Karachi',
      centroid: { lat: 24.87, lng: 67.01 },
      severity: 'high',
      status: 'active',
      runId: 'run-new',
    });
    await HotspotPublication.create({
      city: 'Karachi',
      currentRunId: 'run-new',
      previousRunId: 'run-old',
    });

    const scoped = await aggregateReportData({ city: 'Karachi' });
    expect(scoped.activeHotspotsCount).toBe(1);
    expect(scoped.hotspots.map((h) => h.clusterId)).toEqual(['agg-new']);

    // Unscoped call resolves the pointer for every published city too.
    const all = await aggregateReportData({});
    expect(all.activeHotspotsCount).toBe(1);
    expect(all.hotspots.map((h) => h.clusterId)).toEqual(['agg-new']);
  });
});
