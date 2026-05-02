/**
 * Format raw data points into the format expected by leaflet.heat
 *
 * @param {Array} points - Array of { lat, lng, temp, severity }
 * @returns {Array} Array of [lat, lng, intensity]
 */
export const formatHeatmapPoints = (points) => {
  if (!points || points.length === 0) return [];

  return points.map((p) => {
    // Convert severity (1-5) into heat intensity (0-1)
    const intensity = p.severity ? p.severity / 5 : 0.5;
    return [p.lat, p.lng, intensity];
  });
};

/**
 * Standard configuration for leaflet.heat
 */
export const HEATMAP_CONFIG = {
  radius: 25,
  blur: 18,
  maxZoom: 15,
  gradient: {
    0.2: '#2a9d8f', // Low
    0.4: '#facc15', // Moderate
    0.6: '#f97316', // High
    0.8: '#dc2626', // Very High
    1.0: '#991b1b', // Extreme
  },
};
