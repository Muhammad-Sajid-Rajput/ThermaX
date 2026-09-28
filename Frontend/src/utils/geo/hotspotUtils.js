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
