/**
 * Convert raw clusters of point indices into detailed hotspot objects.
 *
 * @param {Array} clusters - Array of arrays containing point indices
 * @param {Array} points - Original dataset of points
 * @returns {Array} Array of processed hotspot objects
 */
export const processClustersToHotspots = (clusters, points) => {
  if (!clusters || clusters.length === 0) return [];

  return clusters.map((clusterIndices, index) => {
    let sumLat = 0;
    let sumLng = 0;
    let sumTemp = 0;
    let sumSev = 0;
    let sevCount = 0;

    const numReports = clusterIndices.length;

    // Real temperatures only — a missing reading is excluded, never 0.
    const temps = [];

    clusterIndices.forEach((idx) => {
      const p = points[idx];
      sumLat += p.lat;
      sumLng += p.lng;
      // Only real measurements: a missing temperature is excluded from the
      // average — never treated as 0°C and never invented.
      const t = Number(p.temp);
      if (p.temp != null && !Number.isNaN(t)) {
        temps.push(t);
        sumTemp += t;
      }
      const s = Number(p.severity);
      if (p.severity != null && !Number.isNaN(s)) {
        sumSev += s;
        sevCount += 1;
      }
    });

    const avgLat = sumLat / numReports;
    const avgLng = sumLng / numReports;
    const avgTemp = temps.length > 0 ? sumTemp / temps.length : null;
    const avgSev = sevCount > 0 ? sumSev / sevCount : null;

    // NOTE: no confidence score is computed here. The backend deliberately
    // sends no confidence (no model emits one), so the UI must not invent
    // one from report counts or variance and present it as a model output.

    // Severity classification
    let severityLabel = 'Unknown';
    if (avgSev != null) {
      if (avgSev >= 4.5) severityLabel = 'Extreme';
      else if (avgSev >= 3.5) severityLabel = 'High';
      else if (avgSev >= 2.5) severityLabel = 'Moderate';
      else severityLabel = 'Low';
    }
    return {
      id: `HS-${index + 1}`,
      centroid: { lat: avgLat, lng: avgLng },
      avgTemp: avgTemp != null ? Number(avgTemp.toFixed(1)) : null,
      avgSeverity: avgSev != null ? Number(avgSev.toFixed(1)) : null,
      severityLabel,
      reportCount: numReports,
    };
  });
};

// TVI tier thresholds matching ML Phase 5/6:
// Critical (>=0.65), High (>=0.45), Moderate (>=0.25), Low (<0.25)
// Thermal hotspots use warm hazard tones: red, flame orange, deep amber, golden yellow. No greens.
export const TVI_TIER_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  moderate: '#f59e0b',
  low: '#eab308',
  unknown: '#c2410c',
};

export const PRIORITY_COLORS = {
  Extreme: '#dc2626',
  Critical: '#dc2626',
  High: '#f97316',
  Moderate: '#f59e0b',
  Medium: '#f59e0b',
  Low: '#eab308',
};

/**
 * Resolves color based strictly on TVI tier when present,
 * falling back to TVI numerical score, then citizen report severity.
 */
export function getHotspotColor(hs) {
  const riskTier = String(hs?.riskTier || '').toLowerCase();
  if (riskTier && TVI_TIER_COLORS[riskTier]) {
    return TVI_TIER_COLORS[riskTier];
  }
  if (hs?.tvi != null && Number.isFinite(Number(hs.tvi))) {
    const val = Number(hs.tvi);
    if (val >= 0.65) return TVI_TIER_COLORS.critical;
    if (val >= 0.45) return TVI_TIER_COLORS.high;
    if (val >= 0.25) return TVI_TIER_COLORS.moderate;
    return TVI_TIER_COLORS.low;
  }
  const priority = hs?.severityLabel || hs?.priority;
  return PRIORITY_COLORS[priority] ?? '#c2410c';
}

/**
 * Computes a balanced hotspot perimeter envelope radius in meters based on cluster density.
 * Kept tight and accurate to localized thermal microclimates (200m - 1000m)
 * tied directly to the 1 km DBSCAN spatial clustering neighborhood sweep.
 *
 * @param {number} reportCount - Number of reports in the cluster
 * @returns {number} Radius in meters
 */
export function getHotspotRadius(reportCount = 1) {
  const count = Number.isFinite(Number(reportCount)) ? Math.max(1, Number(reportCount)) : 1;
  return Math.min(200 + count * 50, 1000);
}

