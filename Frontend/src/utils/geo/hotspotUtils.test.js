import { describe, it, expect } from 'vitest';
import { processClustersToHotspots } from './hotspotUtils.js';

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
