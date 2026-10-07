import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';
import { generateAccessToken } from '../utils/jwt.js';
import {
  buildInsights,
  minReportsForTrend,
  DEFAULT_MIN_REPORTS_FOR_TREND,
} from '../services/insightsService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);

async function makeUser(role, tag) {
  const user = await User.create({
    name: `Insights ${tag}`,
    email: `insights-${tag}@insights.test`,
    password: 'Str0ng!Passw0rd',
    role,
    isEmailVerified: true,
  });
  return generateAccessToken(user._id, user.role);
}

const adminToken = () => makeUser(ROLES.ADMIN, 'admin');

const authed = (token, path, query = {}) =>
  request(app).get(path).query(query).set('Authorization', `Bearer ${token}`);

/** Seed `count` reports; `overrides` may be an object or an (index) => object. */
function seedReports(count, overrides = {}) {
  const docs = Array.from({ length: count }, (_, i) => ({
    latitude: 24.86,
    longitude: 67.0,
    severityLevel: (i % 5) + 1,
    city: 'Karachi',
    areaName: 'Gulshan-e-Iqbal',
    status: 'verified',
    ambientTemp: 40,
    createdAt: daysAgo(1.25 + (i % 5)),
    ...(typeof overrides === 'function' ? overrides(i) : overrides),
  }));
  return Report.insertMany(docs);
}

function seedHotspot(overrides = {}) {
  return Hotspot.create({
    clusterId: 'CL-01',
    city: 'Karachi',
    district: 'Gulshan-e-Iqbal',
    centroid: { lat: 24.9, lng: 67.1 },
    severity: 'high',
    status: 'active',
    reportCount: 12,
    peakTemp: 46.2,
    runId: 'run-new',
    tvi: 0.72,
    riskTier: 'critical',
    heatIndexMean: 44.1,
    directives: [
      { id: 'open-cooling-centers', text: 'Open public cooling centers.' },
      { id: 'water-points', text: 'Deploy drinking-water points.' },
    ],
    advisory: { en: 'Extreme heat danger.', ur: 'شدید گرمی کا خطرہ ہے۔' },
    ...overrides,
  });
}

const publish = (runId = 'run-new', city = 'Karachi') =>
  HotspotPublication.create({ city, currentRunId: runId });

const BAD_TEXT = /null|undefined|NaN/;

afterEach(() => {
  delete process.env.INSIGHTS_MIN_REPORTS_FOR_TREND;
  vi.restoreAllMocks();
});

describe('insights — auth (admin-only)', () => {
  it('rejects unauthenticated requests with 401 on both endpoints', async () => {
    const a = await request(app).get('/api/v1/insights').query({ city: 'Karachi' });
    const b = await request(app).get('/api/v1/insights/export').query({ city: 'Karachi' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
  });

  it('rejects a non-admin with 403 on both endpoints', async () => {
    const token = await makeUser(ROLES.USER, 'citizen');
    const a = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    const b = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format: 'csv' });
    expect(a.status).toBe(403);
    expect(b.status).toBe(403);
  });

  it('is also reachable on the legacy /api mount for admins', async () => {
    const token = await adminToken();
    const res = await authed(token, '/api/insights', { city: 'Karachi' });
    expect(res.status).toBe(200);
  });
});

describe('insights — validation', () => {
  it('rejects a missing city with 400 (no Karachi default)', async () => {
    const token = await adminToken();
    const res = await authed(token, '/api/v1/insights');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/city is required/i);
  });

  it('rejects an unknown city with 400', async () => {
    const token = await adminToken();
    const res = await authed(token, '/api/v1/insights', { city: 'Atlantis' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Supported cities/);
  });

  it('rejects days outside 7/30/90 with 400', async () => {
    const token = await adminToken();
    for (const days of ['45', '0', '-7', '30.5', 'abc', '365']) {
      const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days });
      expect(res.status, `days=${days}`).toBe(400);
    }
  });

  it('rejects object-style query injection with 400', async () => {
    const token = await adminToken();
    const cityInj = await request(app)
      .get('/api/v1/insights?city[$ne]=x')
      .set('Authorization', `Bearer ${token}`);
    const areaInj = await request(app)
      .get('/api/v1/insights?city=Karachi&area[$ne]=x')
      .set('Authorization', `Bearer ${token}`);
    expect(cityInj.status).toBe(400);
    expect(areaInj.status).toBe(400);
  });

  it('defaults days to 30 and accepts 7 and 90', async () => {
    const token = await adminToken();
    const def = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(def.body.scope.days).toBe(30);
    for (const days of [7, 90]) {
      const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days });
      expect(res.status).toBe(200);
      expect(res.body.scope.days).toBe(days);
    }
  });
});

describe('insights — payload shape', () => {
  it('returns the documented shape for a populated city', async () => {
    const token = await adminToken();
    await seedReports(12);
    await seedHotspot();
    await publish();

    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days: 30 });
    expect(res.status).toBe(200);
    const p = res.body;

    expect(Object.keys(p)).toEqual([
      'scope',
      'dataQuality',
      'summary',
      'baseline',
      'severityDistribution',
      'volumeSeries',
      'tempSeries',
      'hotspots',
      'topDirectives',
      'takeaways',
    ]);
    expect(p.scope).toMatchObject({ city: 'Karachi', area: null, days: 30 });
    expect(new Date(p.scope.to) - new Date(p.scope.from)).toBe(30 * DAY_MS);
    expect(p.dataQuality).toEqual({
      reportCount: 12,
      verifiedCount: 12,
      flaggedCount: 0,
      trendEligible: true,
      minReportsForTrend: DEFAULT_MIN_REPORTS_FOR_TREND,
      syntheticExcluded: true,
      hotspotRunId: 'run-new',
    });
    expect(p.summary).toMatchObject({
      totalReports: 12,
      avgTemp: 40,
      peakTemp: 40,
      activeHotspots: 1,
      criticalHotspots: 1,
    });
    expect(p.summary.avgSeverity).toBeCloseTo(2.8, 1);
    expect(p.severityDistribution).toEqual([
      { severity: 1, count: 3 },
      { severity: 2, count: 3 },
      { severity: 3, count: 2 },
      { severity: 4, count: 2 },
      { severity: 5, count: 2 },
    ]);
    expect(p.hotspots[0]).toMatchObject({
      clusterId: 'CL-01',
      area: 'Gulshan-e-Iqbal',
      reportCount: 12,
      tvi: 0.72,
      riskTier: 'critical',
      peakTemp: 46.2,
      heatIndexMean: 44.1,
      centroid: { lat: 24.9, lng: 67.1 },
      advisory: { en: 'Extreme heat danger.', ur: 'شدید گرمی کا خطرہ ہے۔' },
    });
    expect(p.hotspots[0].directives).toHaveLength(2);
    expect(typeof p.hotspots[0].id).toBe('string');
  });

  it('returns avg/peak/severity as null (never 0) when no measurements exist', async () => {
    const token = await adminToken();
    await seedReports(3, { ambientTemp: undefined, severityLevel: undefined });
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.summary.totalReports).toBe(3);
    expect(res.body.summary.avgTemp).toBeNull();
    expect(res.body.summary.peakTemp).toBeNull();
    expect(res.body.summary.avgSeverity).toBeNull();
    expect(res.body.baseline.cityAvgTemp).toBeNull();
    expect(res.body.baseline.areaAvgTempDelta).toBeNull();
  });
});

describe('insights — area filter is a literal substring', () => {
  it('treats regex metacharacters literally', async () => {
    const token = await adminToken();
    await seedReports(2, { areaName: 'Gulshan.*' });
    await seedReports(3, { areaName: 'Gulshan-e-Iqbal' });

    const literal = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'Gulshan.*' });
    expect(literal.status).toBe(200);
    // An unescaped ".*" would also match Gulshan-e-Iqbal and give 5.
    expect(literal.body.summary.totalReports).toBe(2);

    const plain = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'Gulshan' });
    expect(plain.body.summary.totalReports).toBe(5);
  });

  it('matches case-insensitively and echoes the trimmed area in scope', async () => {
    const token = await adminToken();
    await seedReports(2);
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', area: '  GULSHAN  ' });
    expect(res.body.scope.area).toBe('GULSHAN');
    expect(res.body.summary.totalReports).toBe(2);
  });

  it('filters hotspots by the same literal substring', async () => {
    const token = await adminToken();
    await seedHotspot({ clusterId: 'CL-01', district: 'Gulshan-e-Iqbal' });
    await seedHotspot({ clusterId: 'CL-02', district: 'Saddar', tvi: 0.4, riskTier: 'moderate' });
    await publish();

    const area = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'gulshan' });
    expect(area.body.hotspots.map((h) => h.clusterId)).toEqual(['CL-01']);
    expect(area.body.summary.activeHotspots).toBe(1);

    const regexy = await authed(token, '/api/v1/insights', { city: 'Karachi', area: '.*' });
    expect(regexy.body.hotspots).toEqual([]);
  });
});

describe('insights — verified-only, synthetic, window, city scoping', () => {
  it('counts only verified reports in aggregates', async () => {
    const token = await adminToken();
    await seedReports(4, { status: 'verified', ambientTemp: 40 });
    await seedReports(2, { status: 'flagged', ambientTemp: 60 });
    await seedReports(2, { status: 'pending', ambientTemp: 70 });
    await seedReports(1, { status: 'rejected', ambientTemp: 80 });

    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.summary.totalReports).toBe(4);
    expect(res.body.summary.avgTemp).toBe(40);
    expect(res.body.summary.peakTemp).toBe(40);
    expect(res.body.severityDistribution.reduce((n, s) => n + s.count, 0)).toBe(4);
    expect(res.body.dataQuality).toMatchObject({
      verifiedCount: 4,
      flaggedCount: 2,
      reportCount: 6,
    });
    expect(res.body.baseline.cityReportCount).toBe(4);
  });

  it('excludes synthetic rows by default and includes them only on includeSynthetic=true', async () => {
    const token = await adminToken();
    await seedReports(3);
    await seedReports(2, { isSynthetic: true });

    const def = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(def.body.summary.totalReports).toBe(3);
    expect(def.body.dataQuality.syntheticExcluded).toBe(true);

    const opted = await authed(token, '/api/v1/insights', {
      city: 'Karachi',
      includeSynthetic: 'true',
    });
    expect(opted.body.summary.totalReports).toBe(5);
    expect(opted.body.dataQuality.syntheticExcluded).toBe(false);

    const junk = await authed(token, '/api/v1/insights', {
      city: 'Karachi',
      includeSynthetic: 'yes',
    });
    expect(junk.body.summary.totalReports).toBe(3);
  });

  it('honours the time window', async () => {
    const token = await adminToken();
    await seedReports(2, { createdAt: daysAgo(3) });
    await seedReports(2, { createdAt: daysAgo(20) });
    await seedReports(2, { createdAt: daysAgo(60) });

    const counts = {};
    for (const days of [7, 30, 90]) {
      const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days });
      counts[days] = res.body.summary.totalReports;
    }
    expect(counts).toEqual({ 7: 2, 30: 4, 90: 6 });
  });

  it('never mixes cities', async () => {
    const token = await adminToken();
    await seedReports(3, { city: 'Karachi' });
    await seedReports(5, { city: 'Lahore', areaName: 'Gulberg' });
    const res = await authed(token, '/api/v1/insights', { city: 'Lahore' });
    expect(res.body.summary.totalReports).toBe(5);
  });

  it('aggregates reports province-wide and matches areas like Jamshoro in Sindh', async () => {
    const token = await adminToken();
    await seedReports(2, {
      city: 'SOS Children Village Jamshoro, Hyderabad Division',
      areaName: 'SOS Children Village Jamshoro, Hyderabad Division',
      district: 'Hyderabad Division',
      latitude: 25.406,
      longitude: 68.255,
      ambientTemp: 28,
    });
    await seedReports(3, {
      city: 'Karachi',
      areaName: 'Clifton',
      latitude: 24.81,
      longitude: 67.03,
      ambientTemp: 32,
    });

    const jamshoro = await authed(token, '/api/v1/insights', {
      province: 'Sindh',
      area: 'jamshoro',
      days: 30,
    });
    expect(jamshoro.status).toBe(200);
    expect(jamshoro.body.scope.province).toBe('Sindh');
    expect(jamshoro.body.summary.totalReports).toBe(2);
    expect(jamshoro.body.summary.avgTemp).toBe(28);

    const allSindh = await authed(token, '/api/v1/insights', {
      province: 'Sindh',
      days: 30,
    });
    expect(allSindh.status).toBe(200);
    expect(allSindh.body.summary.totalReports).toBe(5);
  });
});

describe('insights — trend eligibility', () => {
  it('withholds series and trajectory below the threshold', async () => {
    const token = await adminToken();
    await seedReports(3);
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.dataQuality.trendEligible).toBe(false);
    expect(res.body.volumeSeries).toEqual([]);
    expect(res.body.tempSeries).toEqual([]);
    expect(res.body.takeaways.some((t) => /Report volume/.test(t))).toBe(false);
    expect(res.body.takeaways).toContain(
      'Fewer than 10 verified reports in this window — trends withheld until more data arrives.'
    );
  });

  it('returns zero-filled daily series once the threshold is met', async () => {
    const token = await adminToken();
    await seedReports(12);
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.dataQuality.trendEligible).toBe(true);
    const dates = res.body.volumeSeries.map((p) => p.date);
    expect(dates.length).toBeGreaterThanOrEqual(30);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
    expect(res.body.volumeSeries.reduce((n, p) => n + p.count, 0)).toBe(12);
    expect(res.body.volumeSeries.some((p) => p.count === 0)).toBe(true);
    expect(res.body.tempSeries.map((p) => p.date)).toEqual(dates);
    // Empty days are gaps, not zeros.
    expect(res.body.tempSeries.filter((p) => p.avgTemp === null).length).toBeGreaterThan(0);
    expect(res.body.tempSeries.every((p) => p.avgTemp === null || p.avgTemp === 40)).toBe(true);
    expect(res.body.takeaways.some((t) => /trends withheld/.test(t))).toBe(false);
  });

  it('honours INSIGHTS_MIN_REPORTS_FOR_TREND and ignores garbage values', async () => {
    const token = await adminToken();
    await seedReports(3);

    process.env.INSIGHTS_MIN_REPORTS_FOR_TREND = '3';
    const lowered = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(lowered.body.dataQuality.minReportsForTrend).toBe(3);
    expect(lowered.body.dataQuality.trendEligible).toBe(true);

    for (const bad of ['', 'abc', '0', '-5', '2.5']) {
      process.env.INSIGHTS_MIN_REPORTS_FOR_TREND = bad;
      expect(minReportsForTrend(), `value "${bad}"`).toBe(DEFAULT_MIN_REPORTS_FOR_TREND);
    }
  });

  it('reports a volume drop vs the previous window when both windows are large enough', async () => {
    const token = await adminToken();
    await seedReports(12, { createdAt: daysAgo(5) });
    await seedReports(24, { createdAt: daysAgo(45) });
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days: 30 });
    expect(res.body.takeaways).toContain('Report volume down 50% vs the previous 30 days.');
  });

  it('reports a volume rise', async () => {
    const token = await adminToken();
    await seedReports(30, { createdAt: daysAgo(5) });
    await seedReports(20, { createdAt: daysAgo(45) });
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days: 30 });
    expect(res.body.takeaways).toContain('Report volume up 50% vs the previous 30 days.');
  });

  it('omits the trajectory takeaway when the previous window is below the threshold', async () => {
    const token = await adminToken();
    await seedReports(12, { createdAt: daysAgo(5) });
    await seedReports(3, { createdAt: daysAgo(45) });
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', days: 30 });
    expect(res.body.takeaways.some((t) => /Report volume/.test(t))).toBe(false);
  });

  it('buckets days in the city timezone, not UTC', async () => {
    await seedReports(12, { createdAt: new Date('2026-10-02T12:00:00Z') });
    // 20:00Z on the 4th is 01:00 on the 5th in Asia/Karachi (UTC+5).
    await seedReports(1, { createdAt: new Date('2026-10-04T20:00:00Z') });
    const payload = await buildInsights(
      { city: 'Karachi', days: 7 },
      { now: new Date('2026-10-05T10:00:00Z') }
    );
    const day = (d) => payload.volumeSeries.find((p) => p.date === d);
    expect(day('2026-10-05').count).toBe(1);
    expect(day('2026-10-04').count).toBe(0);
    expect(day('2026-10-02').count).toBe(12);
  });
});

describe('insights — hotspots, directives and takeaways', () => {
  async function seedRichScenario() {
    // 10 reports in Gulshan at 44°C + 10 elsewhere at 40°C → city avg 42, delta +2.
    await seedReports(10, { areaName: 'Gulshan-e-Iqbal', ambientTemp: 44 });
    await seedReports(10, { areaName: 'Saddar', ambientTemp: 40 });
    await seedHotspot({ clusterId: 'CL-02', district: 'Gulshan-e-Iqbal Block 13', tvi: 0.4, riskTier: 'moderate', peakTemp: 41.0, reportCount: 5, directives: [{ id: 'open-cooling-centers', text: 'Open public cooling centers.' }] });
    await seedHotspot({ clusterId: 'CL-01' });
    await seedHotspot({ clusterId: 'CL-03', district: 'Saddar', tvi: null, riskTier: 'unknown', directives: [], advisory: null, heatIndexMean: null });
    await seedHotspot({ clusterId: 'CL-OLD', runId: 'run-old', tvi: 0.99, riskTier: 'critical' });
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-new', previousRunId: 'run-old' });
  }

  it('ranks hotspots by TVI descending, unscored last and never zeroed, current run only', async () => {
    const token = await adminToken();
    await seedRichScenario();
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.hotspots.map((h) => h.clusterId)).toEqual(['CL-01', 'CL-02', 'CL-03']);
    const unscored = res.body.hotspots[2];
    expect(unscored.tvi).toBeNull();
    expect(unscored.riskTier).toBe('unknown');
    expect(unscored.advisory).toBeNull();
    expect(res.body.summary).toMatchObject({ activeHotspots: 3, criticalHotspots: 1 });
    expect(res.body.dataQuality.hotspotRunId).toBe('run-new');
  });

  it('aggregates directives de-duplicated by id, sorted by hotspotCount', async () => {
    const token = await adminToken();
    await seedRichScenario();
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'Gulshan' });
    expect(res.body.topDirectives).toEqual([
      { id: 'open-cooling-centers', text: 'Open public cooling centers.', hotspotCount: 2 },
      { id: 'water-points', text: 'Deploy drinking-water points.', hotspotCount: 1 },
    ]);
  });

  it('fills the takeaway templates from payload numbers only', async () => {
    const token = await adminToken();
    await seedRichScenario();
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'Gulshan' });
    expect(res.body.baseline).toMatchObject({
      cityAvgTemp: 42,
      areaAvgTempDelta: 2,
      cityReportCount: 20,
    });
    expect(res.body.takeaways).toEqual([
      'Highest-risk zone: Gulshan-e-Iqbal (TVI 0.72, critical). 12 verified reports, peak 46.2°C.',
      'This area averages 2.0°C above the Karachi city average over the same period.',
      'Recommended focus: Open public cooling centers — relevant to 2 of 2 hotspots in this area.',
      'Based on 10 verified reports (0 flagged reports excluded from scoring).',
    ]);
  });

  it('has no baseline comparison when no area is selected', async () => {
    const token = await adminToken();
    await seedRichScenario();
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.baseline.areaAvgTempDelta).toBeNull();
    expect(res.body.takeaways.some((t) => /city average/.test(t))).toBe(false);
  });

  it('omits the highest-risk takeaway when the top hotspot is unscored', async () => {
    const token = await adminToken();
    await seedHotspot({ clusterId: 'CL-X', tvi: null, riskTier: 'unknown', directives: [], advisory: null });
    await publish();
    const res = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    expect(res.body.takeaways.some((t) => /Highest-risk/.test(t))).toBe(false);
  });

  it('never emits null / undefined / NaN in takeaways', async () => {
    const token = await adminToken();
    const empty = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    for (const t of empty.body.takeaways) expect(t).not.toMatch(BAD_TEXT);

    await seedReports(3, { ambientTemp: undefined, severityLevel: undefined });
    await seedHotspot({ clusterId: 'CL-X', peakTemp: undefined, tvi: null, directives: [], riskTier: 'unknown' });
    await publish();
    const sparse = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'Gulshan' });
    for (const t of sparse.body.takeaways) expect(t).not.toMatch(BAD_TEXT);

    await HotspotPublication.deleteMany({});
    await Hotspot.deleteMany({});
    await Report.deleteMany({});
    await seedRichScenario();
    const rich = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'Gulshan' });
    expect(rich.body.takeaways.length).toBeGreaterThan(0);
    for (const t of rich.body.takeaways) expect(t).not.toMatch(BAD_TEXT);
  });
});

describe('insights — exports', () => {
  it('serves CSV as an attachment with the documented sections', async () => {
    const token = await adminToken();
    await seedReports(12);
    await seedHotspot();
    await publish();
    const res = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toBe('attachment; filename=insights-karachi-30d.csv');
    for (const name of [
      'SUMMARY',
      'TAKEAWAYS',
      'SEVERITY_DISTRIBUTION',
      'VOLUME_SERIES',
      'TEMP_SERIES',
      'HOTSPOT_RANKING',
      'TOP_DIRECTIVES',
    ]) {
      expect(res.text).toContain(`SECTION,${name}`);
    }
    // Data-quality footnote travels with every export.
    expect(res.text).toContain('dataQuality.verifiedCount,12');
    expect(res.text).toContain('dataQuality.syntheticExcluded,true');
    expect(res.text).toContain('dataQuality.hotspotRunId,"run-new"');
    // TVI / tier / directive ids appear in the ranking.
    expect(res.text).toContain('1,"CL-01","Gulshan-e-Iqbal",12,0.72,"critical",46.2,44.1,24.9,67.1,"open-cooling-centers;water-points"');
  });

  it('neutralizes formula injection in free-text cells', async () => {
    const token = await adminToken();
    await seedHotspot({ district: '=HYPERLINK("http://evil.test")' });
    await publish();

    const ranking = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format: 'csv' });
    expect(ranking.text).toContain(`"'=HYPERLINK(""http://evil.test"")"`);

    const scoped = await authed(token, '/api/v1/insights/export', {
      city: 'Karachi',
      area: '=cmd|calc',
      format: 'csv',
    });
    expect(scoped.text).toContain(`scope.area,"'=cmd|calc"`);

    for (const csv of [ranking.text, scoped.text]) {
      // No cell may start with a raw formula prefix.
      expect(csv).not.toMatch(/(^|,)"?[=+@]/m);
    }
  });

  it('keeps a negative temperature delta numeric, not guarded text', async () => {
    const token = await adminToken();
    await seedReports(10, { areaName: 'Gulshan-e-Iqbal', ambientTemp: 38 });
    await seedReports(10, { areaName: 'Saddar', ambientTemp: 42 });
    const res = await authed(token, '/api/v1/insights/export', {
      city: 'Karachi',
      area: 'Gulshan',
      format: 'csv',
    });
    expect(res.text).toContain('baseline.areaAvgTempDelta,-2');
    expect(res.text).not.toContain("'-2");
  });

  it('marks withheld series in CSV when below the trend threshold', async () => {
    const token = await adminToken();
    await seedReports(3);
    const res = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format: 'csv' });
    expect(res.text).toContain('trends withheld: fewer than 10 verified reports in this window');
    expect(res.text).toContain('dataQuality.trendEligible,false');
  });

  it('serves JSON as an attachment equal to GET /insights (default and format=json)', async () => {
    const token = await adminToken();
    await seedReports(12);
    await seedHotspot();
    await publish();

    const body = (await authed(token, '/api/v1/insights', { city: 'Karachi', days: 7 })).body;
    for (const query of [
      { city: 'Karachi', days: 7 },
      { city: 'Karachi', days: 7, format: 'json' },
    ]) {
      const res = await authed(token, '/api/v1/insights/export', query);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toBe('attachment; filename=insights-karachi-7d.json');
      const strip = (p) => ({ ...p, scope: { ...p.scope, from: undefined, to: undefined } });
      expect(strip(JSON.parse(res.text))).toEqual(strip(body));
    }
  });

  it('answers format=pdf (and any other format) with an honest 400', async () => {
    const token = await adminToken();
    for (const format of ['pdf', 'html', 'xlsx']) {
      const res = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format });
      expect(res.status, format).toBe(400);
      expect(res.body.error).toBe('Unsupported format');
      expect(res.body.message).toMatch(/PDF/);
    }
  });

  it('validates export parameters like the main endpoint', async () => {
    const token = await adminToken();
    const res = await authed(token, '/api/v1/insights/export', { city: 'Atlantis', format: 'csv' });
    expect(res.status).toBe(400);
  });
});

describe('insights — database failures', () => {
  it('answers 503, not an empty payload, when the database is unreachable', async () => {
    const token = await adminToken();
    const err = Object.assign(new Error('connection refused'), { name: 'MongoNetworkError' });
    vi.spyOn(Report, 'find').mockImplementation(() => ({
      select: () => ({ lean: () => Promise.reject(err) }),
    }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const a = await authed(token, '/api/v1/insights', { city: 'Karachi' });
    const b = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format: 'csv' });
    for (const res of [a, b]) {
      expect(res.status).toBe(503);
      expect(res.body.summary).toBeUndefined();
      expect(res.body.message).toBe('Database unavailable');
    }
  });
});
