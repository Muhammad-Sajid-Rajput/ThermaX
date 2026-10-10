import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';
import { generateAccessToken } from '../utils/jwt.js';
import AdminNotification from '../models/AdminNotification.js';
import {
  buildInsights,
  minReportsForTrend,
  DEFAULT_MIN_REPORTS_FOR_TREND,
  buildActionPlan,
  flagReceptors,
  buildDangerWindows,
  buildComparative,
  buildEscalationWatch,
  buildCauseBreakdown,
  buildMinisterParagraph,
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
  delete process.env.INSIGHTS_ESCALATE_COUNT;
  delete process.env.INSIGHTS_WATCH_COUNT;
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
      'ministerBrief',
      'escalation',
      'comparative',
      'dangerWindow',
      'receptorFlags',
      'actionPlan',
      'causeBreakdown',
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
      hotspotRuns: [{ city: 'Karachi', runId: 'run-new' }],
      hotspotEmptyReason: null,
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
      'Ranked #1 of 2 areas in Karachi by mean hotspot TVI.',
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
    expect(res.text).toContain('1,"CL-01","Gulshan-e-Iqbal",12,0.72,"","heat;reports;population","critical",46.2,44.1,24.9,67.1,"open-cooling-centers;water-points"');
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

describe('insights — actionability upgrade (F1–F8)', () => {
  it('F1: ranks action plan by weighted tier score and derives owner/cost/timeline', () => {
    const hotspots = [
      {
        id: 'hs-1',
        area: 'Gulshan',
        riskTier: 'critical',
        reportCount: 10,
        tvi: 0.85,
        directives: [
          { id: 'water-points', text: 'Deploy drinking-water points.' },
          { id: 'tree-planting', text: 'Urban tree plantation.' },
        ],
      },
      {
        id: 'hs-2',
        area: 'Saddar',
        riskTier: 'moderate',
        reportCount: 10,
        tvi: 0.45,
        directives: [
          { id: 'water-points', text: 'Deploy drinking-water points.' },
        ],
      },
    ];
    const topDirectives = [
      { id: 'tree-planting', text: 'Urban tree plantation.', hotspotCount: 1 },
      { id: 'water-points', text: 'Deploy drinking-water points.', hotspotCount: 2 },
    ];

    const plan = buildActionPlan(hotspots, topDirectives);
    expect(plan).toHaveLength(2);
    // water-points: (critical: 4*10) + (moderate: 2*10) = 60
    // tree-planting: (critical: 4*10) = 40
    expect(plan[0].directiveId).toBe('water-points');
    expect(plan[0].rank).toBe(1);
    expect(plan[0].owner).toBe('Municipal Corporation / PDMA');
    expect(plan[0].costBand).toBe('medium');
    expect(plan[0].timeline).toBe('Short-term (1–8 weeks)');
    expect(plan[0].evidence).toContain('strongest: Gulshan (TVI 0.85, critical)');

    expect(plan[1].directiveId).toBe('tree-planting');
    expect(plan[1].rank).toBe(2);
    expect(plan[1].owner).toBe('Parks & Horticulture Authority');
    expect(plan[1].costBand).toBe('high');
    expect(plan[1].timeline).toBe('Long-term (2–12 months)');
  });

  it('F2: flags vulnerable receptors from hotspot names and verified report notes', () => {
    const hotspots = [
      { id: 'hs-1', area: 'Model Colony School Road', riskTier: 'critical' },
      { id: 'hs-2', area: 'Industrial Area', riskTier: 'high' },
    ];
    const reports = [
      { areaName: 'Industrial Area', description: 'Laborers fainting near hospital gate' },
    ];
    const flags = flagReceptors(hotspots, reports);
    expect(flags).toHaveLength(2);
    expect(flags[0].receptors).toContain('school');
    expect(flags[1].receptors).toEqual(expect.arrayContaining(['health', 'market_labor']));
  });

  it('F2: requires non-empty area overlap and gives empty receptors for hotspot with no area', () => {
    const hotspots = [
      { id: 'hs-no-area', area: null, riskTier: 'critical' },
      { id: 'hs-empty-area', area: '   ', riskTier: 'moderate' },
      { id: 'hs-different-area', area: 'Gulberg', riskTier: 'high' },
    ];
    const reports = [
      { areaName: 'Clifton', description: 'Major school and hospital nearby' },
    ];
    const flags = flagReceptors(hotspots, reports);
    expect(flags).toHaveLength(0);
  });

  it('F3: withholds danger window below 10 reports and detects peak hour when eligible', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const sparseReports = [
      { ambientTemp: 42, createdAt: new Date('2026-06-15T09:00:00Z') },
    ];
    const withheld = buildDangerWindows(sparseReports, 'Asia/Karachi', 10);
    expect(withheld).toEqual({ window: null, reason: 'insufficient-data' });

    // 12 reports: 6 at 14:00 (PKT) and 6 at 15:00 (PKT) with temp 40
    // UTC 09:00 is 14:00 PKT (+5), UTC 10:00 is 15:00 PKT (+5)
    const reports = [
      ...Array.from({ length: 6 }, () => ({ ambientTemp: 41, createdAt: new Date('2026-06-15T09:10:00Z') })),
      ...Array.from({ length: 6 }, () => ({ ambientTemp: 43, createdAt: new Date('2026-06-15T10:10:00Z') })),
    ];
    const detected = buildDangerWindows(reports, 'Asia/Karachi', 10);
    expect(detected).not.toBeNull();
    expect(detected.window).toBe('14:00–16:00');
    expect(detected.peakHour).toBe(15);
    expect(detected.peakMeanTemp).toBe(43);
  });

  it('F4: withholds comparative rank when < 2 areas and ranks correctly when >= 2', () => {
    const oneAreaHotspots = [
      { area: 'Gulshan', tvi: 0.8 },
      { area: 'Gulshan', tvi: 0.6 },
    ];
    const withheld = buildComparative(oneAreaHotspots, 'Gulshan', { cityAvgTemp: 38, areaAvgTempDelta: 2 });
    expect(withheld.areaRank).toBeNull();
    expect(withheld.areasRanked).toBe(1);

    const twoAreaHotspots = [
      { area: 'Gulshan', tvi: 0.8 },
      { area: 'Saddar', tvi: 0.6 },
      { area: 'Clifton', tvi: null }, // unscored excluded from ranking
    ];
    const comparative = buildComparative(twoAreaHotspots, 'Saddar', { cityAvgTemp: 38, areaAvgTempDelta: -1 });
    expect(comparative.areaRank).toBe(2);
    expect(comparative.areasRanked).toBe(2);
    expect(comparative.cityAvgTemp).toBe(38);
    expect(comparative.areaDeltaC).toBe(-1);
  });

  it('F6: checks escalation watch thresholds and tracks admin notifications', async () => {
    const now = new Date('2026-06-15T12:00:00Z');
    // Reports within 48h
    const reports48h = Array.from({ length: 12 }, (_, i) => ({
      _id: `rep-${i}`,
      createdAt: new Date('2026-06-14T12:00:00Z'),
    }));
    // Default thresholds: watch=10, escalate=20 -> 12 reports is WATCH
    const watchStatus = await buildEscalationWatch(reports48h, now);
    expect(watchStatus.status).toBe('WATCH');
    expect(watchStatus.last48hCount).toBe(12);

    // Override thresholds via env
    process.env.INSIGHTS_ESCALATE_COUNT = '10';
    const escalateStatus = await buildEscalationWatch(reports48h, now);
    expect(escalateStatus.status).toBe('ESCALATE');

    // Notification integration
    const user = await User.create({
      name: 'Notifier',
      email: 'notifier@test.com',
      password: 'password123',
    });
    const rep = await Report.create({
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 5,
      city: 'Karachi',
      status: 'verified',
    });
    await AdminNotification.create({
      reportId: rep._id,
      type: 'extreme_contradiction',
      reason: 'Gap >= 15C',
    });

    const notifWatch = await buildEscalationWatch([rep], now);
    expect(notifWatch.outlierNotifications.extreme_contradiction).toBe(1);
    expect(notifWatch.outlierNotifications.enrichment_failed).toBe(0);
  });

  it('F7: withholds cause breakdown below threshold and computes accurate top-8 percentage', () => {
    const sparse = Array.from({ length: 5 }, () => ({
      causes: ['Lack of shade', 'Concrete density'],
    }));
    expect(buildCauseBreakdown(sparse, 10)).toEqual([]);

    // 10 reports with causes
    const reports = [
      ...Array.from({ length: 8 }, () => ({
        causes: ['lack of shade', 'Concrete Density'],
      })),
      ...Array.from({ length: 2 }, () => ({
        causes: ['Lack of Shade', 'Traffic congestion'],
      })),
    ];
    const breakdown = buildCauseBreakdown(reports, 10);
    expect(breakdown).toHaveLength(3);
    // 'Lack of shade' was cited in all 10 reports -> 100%
    expect(breakdown[0].cause.toLowerCase()).toBe('lack of shade');
    expect(breakdown[0].count).toBe(10);
    expect(breakdown[0].pct).toBe(100);

    // 'Concrete Density' was cited in 8 reports -> 80%
    expect(breakdown[1].cause.toLowerCase()).toBe('concrete density');
    expect(breakdown[1].count).toBe(8);
    expect(breakdown[1].pct).toBe(80);
  });

  it('F8: builds a 3-sentence minister briefing and respects omissions', () => {
    const full = buildMinisterParagraph({
      area: 'Gulshan',
      city: 'Karachi',
      verifiedCount: 25,
      days: 30,
      hotspots: [{ id: 'h1' }, { id: 'h2' }],
      peakTemp: 44.5,
      areaAvgTempDelta: 2.1,
      criticalHotspots: 1,
      receptorFlags: [{ hotspotId: 'h1' }],
      actionPlan: [{ action: 'Deploy mist fans', costBand: 'medium', owner: 'PDMA' }],
      dangerWindow: { window: '13:00–16:00' },
    });
    expect(full).toContain('Gulshan (Karachi) recorded 25 verified heat reports in the last 30 days across 2 hotspots, peaking at 44.5°C, 2.1°C above the Karachi average.');
    expect(full).toContain('1 hotspot rated critical, 1 overlapping schools, clinics or markets.');
    expect(full).toContain('Recommended first step: Deploy mist fans (medium cost, PDMA lead), timed outside the 13:00–16:00 danger window.');

    const empty = buildMinisterParagraph({
      area: null,
      city: 'Karachi',
      verifiedCount: null,
      days: 30,
      hotspots: [],
      peakTemp: null,
      criticalHotspots: 0,
      actionPlan: [],
    });
    expect(empty).toBeNull();
  });

  it('end-to-end: scope.briefRef format and CSV export contains new ACTION_PLAN and CAUSE_BREAKDOWN sections', async () => {
    const token = await adminToken();
    await seedReports(15, {
      areaName: 'Gulshan-e-Iqbal',
      ambientTemp: 42,
      causes: ['Heavy traffic', 'Lack of shade'],
    });
    await seedHotspot();
    await publish();

    const jsonRes = await authed(token, '/api/v1/insights', { city: 'Karachi', days: 30 });
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.scope.briefRef).toMatch(/^HTX-KARACHI-\d{8}-30D$/);
    expect(jsonRes.body.actionPlan).toBeDefined();
    expect(jsonRes.body.causeBreakdown).toBeDefined();
    expect(jsonRes.body.escalation).toBeDefined();

    const csvRes = await authed(token, '/api/v1/insights/export', { city: 'Karachi', format: 'csv' });
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('SECTION,ACTION_PLAN');
    expect(csvRes.text).toContain('Indicative band — not a costed estimate.');
    expect(csvRes.text).toContain('SECTION,CAUSE_BREAKDOWN');
    expect(csvRes.text).toContain('ministerBrief,');
    expect(csvRes.text).toContain('scope.briefRef,');
  });
});

describe('insights — empty report fixes (Fixes 1–7)', () => {
  it('Fix 1: province query merges hotspots from >= 2 cities in the province', async () => {
    const token = await adminToken();
    // Seed reports in Punjab
    await seedReports(15, { city: 'Lahore', latitude: 31.52, longitude: 74.35 });
    // Seed publications for Lahore and Rawalpindi (both in Punjab)
    await publish('run-lahore', 'Lahore');
    await publish('run-rwp', 'Rawalpindi');
    // Seed hotspots for both cities
    await seedHotspot({ clusterId: 'CL-LHR', city: 'Lahore', runId: 'run-lahore', area: 'Gulberg' });
    await seedHotspot({ clusterId: 'CL-RWP', city: 'Rawalpindi', runId: 'run-rwp', area: 'Saddar' });

    const res = await authed(token, '/api/v1/insights', { city: 'Punjab', days: 30 });
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(2);
    const clusterIds = res.body.hotspots.map((h) => h.clusterId);
    expect(clusterIds).toContain('CL-LHR');
    expect(clusterIds).toContain('CL-RWP');
    expect(res.body.dataQuality.hotspotRuns).toEqual(
      expect.arrayContaining([
        { city: 'Lahore', runId: 'run-lahore' },
        { city: 'Rawalpindi', runId: 'run-rwp' },
      ])
    );
    expect(res.body.dataQuality.hotspotRunId).toBeNull(); // null for province query
    expect(res.body.dataQuality.hotspotEmptyReason).toBeNull();
  });

  it('Fix 2: sets hotspotEmptyReason to "no-published-run" when no publications exist', async () => {
    const token = await adminToken();
    await seedReports(12, { city: 'Lahore', latitude: 31.52, longitude: 74.35 });
    // No publications seeded!
    const res = await authed(token, '/api/v1/insights', { city: 'Punjab', days: 30 });
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(0);
    expect(res.body.dataQuality.hotspotEmptyReason).toBe('no-published-run');
  });

  it('Fix 2: sets hotspotEmptyReason to "below-threshold" when publication exists but 0 hotspots meet threshold', async () => {
    const token = await adminToken();
    await seedReports(12, { city: 'Lahore', latitude: 31.52, longitude: 74.35 });
    await publish('run-empty', 'Lahore');
    // Publication exists, but 0 active hotspots in DB!
    const res = await authed(token, '/api/v1/insights', { city: 'Lahore', days: 30 });
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(0);
    expect(res.body.dataQuality.hotspotEmptyReason).toBe('below-threshold');
  });

  it('Fix 2b: sets hotspotEmptyReason to "no-area-match" when publication and hotspots exist but area filter yields 0 matches', async () => {
    const token = await adminToken();
    await seedReports(12, { city: 'Karachi', latitude: 24.86, longitude: 67.0 });
    await publish('run-new', 'Karachi');
    await seedHotspot({ city: 'Karachi', district: 'Gulshan-e-Iqbal', runId: 'run-new' });

    const res = await authed(token, '/api/v1/insights', { city: 'Karachi', area: 'NonExistentAreaXYZ', days: 30 });
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(0);
    expect(res.body.dataQuality.hotspotEmptyReason).toBe('no-area-match');
  });

  it('Fix 3: escalation returns NO_RECENT_DATA on 0 recent reports and never STABLE without data', async () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const noReports = [];
    const status = await buildEscalationWatch(noReports, now);
    expect(status.status).toBe('NO_RECENT_DATA');
    expect(status.reason).toBe(
      'No verified reports in the last 48h — escalation cannot be assessed; check the reporting pipeline.'
    );
  });

  it('P1-4: exposes tviComponents component list in /api/v1/insights and /api/v1/hotspots DTOs', async () => {
    const token = await adminToken();
    await seedReports(12, { city: 'Karachi', latitude: 24.86, longitude: 67.0 });
    await publish('run-new', 'Karachi');
    await seedHotspot({
      city: 'Karachi',
      district: 'Gulshan-e-Iqbal',
      runId: 'run-new',
      tvi: 0.72,
      tviComponents: ['heat', 'reports'],
      tviWeightsUsed: { heat: 0.6, reports: 0.4 },
    });

    const insightsRes = await authed(token, '/api/v1/insights', { city: 'Karachi', days: 30 });
    expect(insightsRes.status).toBe(200);
    expect(insightsRes.body.hotspots).toHaveLength(1);
    expect(insightsRes.body.hotspots[0].tviComponents).toEqual(['heat', 'reports']);
    expect(insightsRes.body.hotspots[0].tviComponentsMissing).toEqual(['population']);

    const hotspotsRes = await request(app).get('/api/v1/hotspots?city=Karachi');
    expect(hotspotsRes.status).toBe(200);
    expect(hotspotsRes.body.hotspots).toHaveLength(1);
    expect(hotspotsRes.body.hotspots[0].tviComponents).toEqual(['heat', 'reports']);
    expect(hotspotsRes.body.hotspots[0].tviComponentsMissing).toEqual(['population']);
  });

  it('Fix 4: minister paragraph for province scope contains no doubled name and handles 0 hotspots', () => {
    const provinceWithHotspots = buildMinisterParagraph({
      provinceName: 'Punjab',
      city: 'Punjab',
      isProvinceQuery: true,
      verifiedCount: 73,
      days: 30,
      hotspots: [{ id: 'h1' }],
      peakTemp: 40.6,
      areaAvgTempDelta: null,
      criticalHotspots: 0,
      actionPlan: [],
    });
    expect(provinceWithHotspots).toContain('Punjab recorded 73 verified heat reports in the last 30 days across 1 hotspots, peaking at 40.6°C.');
    expect(provinceWithHotspots).not.toContain('Punjab (Punjab)');

    const provinceZeroHotspots = buildMinisterParagraph({
      provinceName: 'Punjab',
      city: 'Punjab',
      isProvinceQuery: true,
      verifiedCount: 73,
      days: 30,
      hotspots: [],
      peakTemp: 40.6,
      areaAvgTempDelta: null,
      criticalHotspots: 0,
      actionPlan: [],
    });
    expect(provinceZeroHotspots).toContain('Punjab recorded 73 verified heat reports in the last 30 days across 0 hotspots, peaking at 40.6°C.');
    expect(provinceZeroHotspots).toContain('No clustered hotspots were published in this window — findings are report-level only.');
    expect(provinceZeroHotspots).not.toContain('Punjab (Punjab)');
  });

  it('Fix 5: withholds danger window when run is only 1 hour wide', () => {
    // 12 reports all in the 14:00 PKT bucket (09:00 UTC) with 42C
    const reports = Array.from({ length: 12 }, () => ({
      ambientTemp: 42,
      createdAt: new Date('2026-06-15T09:15:00Z'),
    }));
    const res = buildDangerWindows(reports, 'Asia/Karachi', 10);
    expect(res).toEqual({ window: null, reason: 'no-sustained-window' });
  });
});
