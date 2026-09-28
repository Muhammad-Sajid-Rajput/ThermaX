import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Hotspot from '../models/Hotspot.js';
import HotspotPublication from '../models/HotspotPublication.js';

function phase6Hotspot(overrides = {}) {
  return {
    clusterId: 'c-p6',
    city: 'Karachi',
    centroid: { lat: 24.86, lng: 67.0 },
    severity: 'high',
    status: 'active',
    reportCount: 8,
    runId: 'run-p6',
    tvi: 0.72,
    tviComponents: { heat: 0.8, reports: 0.6, population: 0.5 },
    tviWeightsUsed: { heat: 0.5, reports: 0.3, population: 0.2 },
    tviNote: null,
    riskTier: 'critical',
    directives: [
      { id: 'open-cooling-centers', text: 'Open public cooling centers.' },
    ],
    advisory: {
      en: 'Extreme heat danger.',
      ur: 'شدید گرمی کا خطرہ ہے۔',
      tier: 'critical',
      heatIndexBand: 'extreme',
      heatIndex: 46.0,
    },
    heatIndexMean: 46.0,
    directiveContext: { severityBand: 'high' },
    ...overrides,
  };
}

describe('hotspots — Phase 6 DTO fields', () => {
  it('exposes riskTier, directives, advisory, heatIndexMean, tviWeightsUsed, runId', async () => {
    await Hotspot.create(phase6Hotspot());
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-p6' });

    const res = await request(app).get('/api/v1/hotspots?city=Karachi');
    expect(res.status).toBe(200);
    expect(res.body.hotspots).toHaveLength(1);
    const h = res.body.hotspots[0];
    expect(h.riskTier).toBe('critical');
    expect(h.directives).toEqual([
      { id: 'open-cooling-centers', text: 'Open public cooling centers.' },
    ]);
    expect(h.advisory.en).toBe('Extreme heat danger.');
    expect(h.advisory.ur).toContain('شدید');
    expect(h.advisory.heatIndexBand).toBe('extreme');
    expect(h.heatIndexMean).toBe(46.0);
    expect(h.tviWeightsUsed).toEqual({ heat: 0.5, reports: 0.3, population: 0.2 });
    expect(h.runId).toBe('run-p6');
  });

  it('serves null advisory honestly for unscored hotspots', async () => {
    await Hotspot.create(phase6Hotspot({
      clusterId: 'c-p6-unscored',
      tvi: null,
      riskTier: 'unknown',
      directives: [],
      advisory: null,
      heatIndexMean: null,
    }));
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-p6' });

    const res = await request(app).get('/api/v1/hotspots?city=Karachi');
    const h = res.body.hotspots.find((x) => x.clusterId === 'c-p6-unscored');
    expect(h.riskTier).toBe('unknown');
    expect(h.advisory).toBeNull();
    expect(h.directives).toEqual([]);
  });
});

describe('hotspots — GET /hotspots/:id', () => {
  it('returns the full detail DTO for a valid id', async () => {
    const created = await Hotspot.create(phase6Hotspot({ clusterId: 'c-detail' }));
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-p6' });

    const res = await request(app).get(`/api/v1/hotspots/${created._id}`);
    expect(res.status).toBe(200);
    expect(res.body.hotspot.clusterId).toBe('c-detail');
    expect(res.body.hotspot.riskTier).toBe('critical');
    expect(res.body.hotspot.directives).toHaveLength(1);
    expect(res.body.hotspot.tvi).toBeCloseTo(0.72);
  });

  it('returns 400 for a malformed id and 404 for a missing hotspot', async () => {
    const bad = await request(app).get('/api/v1/hotspots/not-an-id');
    expect(bad.status).toBe(400);
    const missing = await request(app).get('/api/v1/hotspots/000000000000000000000000');
    expect(missing.status).toBe(404);
  });
});

describe('dashboard snapshot — pointer-aware hotspot KPIs', () => {
  it('counts only the current run, not the retained previous run', async () => {
    await Hotspot.create(phase6Hotspot({ clusterId: 'c-old', runId: 'run-old', severity: 'critical' }));
    await Hotspot.create(phase6Hotspot({ clusterId: 'c-new', runId: 'run-new', severity: 'critical' }));
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-new', previousRunId: 'run-old' });

    const res = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res.status).toBe(200);
    // Two active hotspot docs exist, but only one is in the current run.
    expect(res.body.activeHotspots).toBe(1);
    expect(res.body.criticalHotspots).toBe(1);
  });

  it('reports zero hotspots honestly when no publication exists', async () => {
    await Hotspot.create(phase6Hotspot({ clusterId: 'c-orphan', runId: 'run-x' }));
    // No HotspotPublication doc at all.

    const res = await request(app).get('/api/v1/dashboard/snapshot');
    expect(res.status).toBe(200);
    expect(res.body.activeHotspots).toBe(0);
  });
});

describe('hotspot model — no fabricated severity default', () => {
  it("defaults severity to 'unknown', never 'high'", async () => {
    const h = await Hotspot.create({
      clusterId: 'c-nodefault',
      city: 'Lahore',
      centroid: { lat: 31.5, lng: 74.3 },
    });
    expect(h.severity).toBe('unknown');
    expect(h.riskTier).toBe('unknown');
  });
});

describe('GET /hotspots/:id — current-run enforcement', () => {
  it('serves a hotspot in the current run', async () => {
    const h = await Hotspot.create(phase6Hotspot({ clusterId: 'c-cur', runId: 'run-new' }));
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-new', previousRunId: 'run-old' });

    const res = await request(app).get(`/api/v1/hotspots/${h._id}`);
    expect(res.status).toBe(200);
    expect(res.body.hotspot.riskTier).toBe('critical');
  });

  it('exposes tviWeightsUsed and runId on the single-hotspot DTO', async () => {
    const h = await Hotspot.create(phase6Hotspot({ clusterId: 'c-detail-dto', runId: 'run-new' }));
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-new', previousRunId: 'run-old' });

    const res = await request(app).get(`/api/v1/hotspots/${h._id}`);
    expect(res.status).toBe(200);
    expect(res.body.hotspot.tviWeightsUsed).toEqual({ heat: 0.5, reports: 0.3, population: 0.2 });
    expect(res.body.hotspot.runId).toBe('run-new');
  });

  it('returns 404 for a previous-run hotspot id (stale, not served)', async () => {
    const h = await Hotspot.create(phase6Hotspot({ clusterId: 'c-stale', runId: 'run-old' }));
    await HotspotPublication.create({ city: 'Karachi', currentRunId: 'run-new', previousRunId: 'run-old' });

    const res = await request(app).get(`/api/v1/hotspots/${h._id}`);
    expect(res.status).toBe(404);
    expect(res.body.hotspot).toBeNull();
  });

  it('returns 404 when no publication exists yet', async () => {
    const h = await Hotspot.create(phase6Hotspot({ clusterId: 'c-nopub', runId: 'run-x' }));
    // No HotspotPublication doc: nothing is current.

    const res = await request(app).get(`/api/v1/hotspots/${h._id}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/v1/hotspots/not-an-id');
    expect(res.status).toBe(400);
  });
});
