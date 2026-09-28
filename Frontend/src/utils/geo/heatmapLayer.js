/**
 * Format raw data points into the format expected by leaflet.heat
 *
 * @param {Array} points - Array of { lat, lng, temp, severity }
 * @returns {Array} Array of [lat, lng, intensity]
 */
export const formatHeatmapPoints = (points) => {
  if (!points || points.length === 0) return [];

  return points
    .filter((p) => p && p.lat != null && p.lng != null)
    .map((p) => {
      let intensity;
      if (typeof p.intensity === 'number' && Number.isFinite(p.intensity)) {
        intensity = Math.max(0, Math.min(1, p.intensity));
      } else if (typeof p.severity === 'number' && Number.isFinite(p.severity)) {
        intensity = Math.max(0, Math.min(1, p.severity / 5));
      } else if (typeof p.severityLevel === 'number' && Number.isFinite(p.severityLevel)) {
        intensity = Math.max(0, Math.min(1, p.severityLevel / 5));
      } else {
        intensity = 0.5;
      }
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
