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

    const numReports = clusterIndices.length;

    // Collect all temperatures to calculate variance later
    const temps = [];

    clusterIndices.forEach((idx) => {
      const p = points[idx];
      sumLat += p.lat;
      sumLng += p.lng;
      sumTemp += p.temp || 0;
      sumSev += p.severity || 1;
      temps.push(p.temp || 0);
    });

    const avgLat = sumLat / numReports;
    const avgLng = sumLng / numReports;
    const avgTemp = sumTemp / numReports;
    const avgSev = sumSev / numReports;

    // Calculate temperature variance
    const tempVariance =
      temps.reduce((acc, val) => acc + Math.pow(val - avgTemp, 2), 0) /
      numReports;

    // Confidence Calculation:
    // More reports = higher confidence
    // Lower variance = higher confidence
    // We normalize this to a 0-1 score (or 0-100%).

    // Base confidence from reports (cap at 10 reports for max base confidence of 80%)
    const reportConfidence = Math.min(numReports / 10, 1.0) * 0.8;

    // Variance confidence (max 20% if variance is very low)
    // Assuming variance of 0 is perfect (+0.2), variance of > 5 is bad (+0.0)
    const varianceConfidence = Math.max(0, (5 - tempVariance) / 5) * 0.2;

    const confidenceScore = (reportConfidence + varianceConfidence) * 100;

    // Severity classification
    let severityLabel = 'Low';
    if (avgSev >= 4.5) severityLabel = 'Extreme';
    else if (avgSev >= 3.5) severityLabel = 'High';
    else if (avgSev >= 2.5) severityLabel = 'Moderate';

    return {
      id: `HS-${index + 1}`,
      centroid: { lat: avgLat, lng: avgLng },
      avgTemp: Number(avgTemp.toFixed(1)),
      avgSeverity: Number(avgSev.toFixed(1)),
      severityLabel,
      reportCount: numReports,
      confidence: Number(confidenceScore.toFixed(0)),
    };
  });
};
