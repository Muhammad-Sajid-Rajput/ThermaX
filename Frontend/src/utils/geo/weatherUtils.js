/**
 * Map weather readings to heatmap intensity (0.2–1.0).
 * Used for Leaflet heat layers and analytics weighting.
 */
export function weatherToIntensity({ heatIndex, temperature, humidity } = {}) {
  const value = heatIndex ?? temperature;
  if (value == null || Number.isNaN(Number(value))) {
    return 0.25;
  }

  const min = 35;
  const max = 50;
  const normalized = (Number(value) - min) / (max - min);
  let intensity = 0.2 + normalized * 0.8;

  if (humidity != null && humidity > 70) {
    intensity = Math.min(1, intensity + 0.05);
  }

  return Number(Math.min(1, Math.max(0.2, intensity)).toFixed(2));
}

/**
 * Enrich DBSCAN cluster points with weather context for priority scoring.
 */
export function enrichPointsWithWeather(points, weatherByKey = new Map()) {
  return points.map((point) => {
    const key = `${Number(point.lat).toFixed(3)}:${Number(point.lng).toFixed(3)}`;
    const weather = weatherByKey.get(key);
    return {
      ...point,
      heatIndex: weather?.heatIndex ?? point.heatIndex ?? point.temperature,
      weatherCondition: weather?.condition,
    };
  });
}

/**
 * Score a cluster by average heat index (for hotspot priority).
 */
export function scoreClusterByHeatIndex(clusterPoints) {
  if (!clusterPoints?.length) return 0;
  const sum = clusterPoints.reduce(
    (acc, p) => acc + (p.heatIndex ?? p.temperature ?? 0),
    0
  );
  return Number((sum / clusterPoints.length).toFixed(1));
}
