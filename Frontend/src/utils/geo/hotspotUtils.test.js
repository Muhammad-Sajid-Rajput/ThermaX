import { describe, it, expect } from 'vitest';
import { processClustersToHotspots, getHotspotColor, getHotspotRadius } from './hotspotUtils.js';

// Regression tests for the pre-Phase-5 honesty pass: the client-side
// DBSCAN path must never invent a confidence score, a temperature, or a
// severity — values that are absent stay absent (null), never 0 and never
// a made-up default.
describe('processClustersToHotspots (no-fabrication)', () => {
  const pts = [
    { lat: 24.86, lng: 67.0, temp: 40, severity: 4 },
    { lat: 24.87, lng: 67.01, temp: 42, severity: 5 },
    { lat: 24.865, lng: 67.005, temp: null, severity: 3 },
  ];

  it('never emits a confidence score', () => {
    const [hs] = processClustersToHotspots([[0, 1, 2]], pts);
    expect(hs).not.toHaveProperty('confidence');
  });

  it('averages only real temperatures — missing ones are excluded, not zeroed', () => {
    const [hs] = processClustersToHotspots([[0, 1, 2]], pts);
    // (40 + 42) / 2 — the null temp must not drag the average toward 0.
    expect(hs.avgTemp).toBe(41);
  });

  it('reports avgTemp null when no member has a measured temperature', () => {
    const [hs] = processClustersToHotspots([[2]], pts);
    expect(hs.avgTemp).toBeNull();
  });

  it('leaves severity null/Unknown when missing instead of inventing one', () => {
    const [hs] = processClustersToHotspots([[0]], [{ lat: 1, lng: 1 }]);
    expect(hs.avgSeverity).toBeNull();
    expect(hs.severityLabel).toBe('Unknown');
  });

  it('still classifies real severities', () => {
    const [hs] = processClustersToHotspots([[0, 1]], pts);
    expect(hs.avgSeverity).toBe(4.5);
    expect(hs.severityLabel).toBe('Extreme');
  });

  it('returns [] for empty or missing clusters', () => {
    expect(processClustersToHotspots([], pts)).toEqual([]);
    expect(processClustersToHotspots(null, pts)).toEqual([]);
  });
});

describe('getHotspotColor (TVI tier derivation)', () => {
  it('maps canonical risk tiers to their color codes', () => {
    expect(getHotspotColor({ riskTier: 'critical' })).toBe('#dc2626');
    expect(getHotspotColor({ riskTier: 'high' })).toBe('#f97316');
    expect(getHotspotColor({ riskTier: 'moderate' })).toBe('#f59e0b');
    expect(getHotspotColor({ riskTier: 'low' })).toBe('#eab308');
  });

  it('maps numerical TVI score when riskTier string is missing', () => {
    expect(getHotspotColor({ tvi: 0.70 })).toBe('#dc2626');
    expect(getHotspotColor({ tvi: 0.50 })).toBe('#f97316');
    expect(getHotspotColor({ tvi: 0.30 })).toBe('#f59e0b');
    expect(getHotspotColor({ tvi: 0.15 })).toBe('#eab308');
  });

  it('falls back to citizen priority or default when unscored', () => {
    expect(getHotspotColor({ priority: 'Critical' })).toBe('#dc2626');
    expect(getHotspotColor({ priority: 'High' })).toBe('#f97316');
    expect(getHotspotColor({ priority: 'Moderate' })).toBe('#f59e0b');
    expect(getHotspotColor({ priority: 'Low' })).toBe('#eab308');
    expect(getHotspotColor({})).toBe('#c2410c');
  });
});

describe('getHotspotRadius (balanced urban envelope scaling)', () => {
  it('returns tight baseline radius for single report or null', () => {
    expect(getHotspotRadius(1)).toBe(530);
    expect(getHotspotRadius()).toBe(530);
    expect(getHotspotRadius(null)).toBe(530);
  });

  it('scales radius moderately with cluster reports', () => {
    expect(getHotspotRadius(4)).toBe(770);
    expect(getHotspotRadius(6)).toBe(930);
  });

  it('caps at maximum 1200m for dense clusters', () => {
    expect(getHotspotRadius(15)).toBe(1200);
    expect(getHotspotRadius(50)).toBe(1200);
  });
});

