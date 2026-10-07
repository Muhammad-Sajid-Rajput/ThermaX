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
  radius: 28,
  blur: 24,
  maxZoom: 7,
  minOpacity: 0.22,
  gradient: {
    0.2: '#2a9d8f', // Soft Low
    0.4: '#eab308', // Soft Moderate
    0.6: '#f97316', // Soft High
    0.8: '#ef4444', // Moderate Red
    1.0: '#dc2626', // Thermal Crimson
  },
};

// Optimize Chromium Canvas2D readbacks for leaflet.heat (eliminates willReadFrequently warning)
if (
  typeof window !== 'undefined' &&
  typeof HTMLCanvasElement !== 'undefined' &&
  HTMLCanvasElement.prototype?.getContext &&
  !HTMLCanvasElement.prototype._thermaxPatched
) {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attributes) {
    if (type === '2d' && attributes === undefined) {
      return origGetContext.call(this, type, { willReadFrequently: true });
    }
    return origGetContext.apply(this, arguments);
  };
  HTMLCanvasElement.prototype._thermaxPatched = true;
}

