import { describe, it, expect } from 'vitest';
import { formatHeatmapPoints } from './heatmapLayer.js';

describe('formatHeatmapPoints', () => {
  it('returns an empty array for empty or missing input', () => {
    expect(formatHeatmapPoints([])).toEqual([]);
    expect(formatHeatmapPoints(null)).toEqual([]);
    expect(formatHeatmapPoints(undefined)).toEqual([]);
  });

  it('converts severity 1–5 into 0–1 heat intensity', () => {
    const out = formatHeatmapPoints([
      { lat: 24.86, lng: 67.0, severity: 5 },
      { lat: 24.87, lng: 67.01, severity: 1 },
    ]);
    expect(out).toEqual([
      [24.86, 67.0, 1],
      [24.87, 67.01, 0.2],
    ]);
  });

  it('defaults missing severity to 0.5 intensity', () => {
    const out = formatHeatmapPoints([{ lat: 24.86, lng: 67.0 }]);
    expect(out).toEqual([[24.86, 67.0, 0.5]]);
  });
});
