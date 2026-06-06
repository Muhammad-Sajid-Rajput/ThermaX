import Weather from '../models/Weather.js';

const ANOMALY_DELTA_C = 8;
// 5 km expressed in radians for $centerSphere (radius / Earth radius)
const NEARBY_RADIUS_RAD = 5000 / 6378100;

/**
 * Find the most-recent weather snapshot within 5 km at or before a report timestamp.
 * Used for citizen vs API anomaly detection.
 *
 * Note: $near cannot be combined with .sort(), so we use $geoWithin + $centerSphere
 * and sort by fetchedAt descending to get the most-recent record in the area.
 */
export async function findNearestWeatherSnapshot(report) {
  const lat = report.location?.lat;
  const lng = report.location?.lng;
  const timestamp = report.timestamp ?? new Date();

  if (lat == null || lng == null) {
    return null;
  }

  try {
    return await Weather.findOne({
      geoPoint: {
        $geoWithin: {
          $centerSphere: [[lng, lat], NEARBY_RADIUS_RAD],
        },
      },
      fetchedAt: { $lte: new Date(timestamp) },
    })
      .sort({ fetchedAt: -1 })
      .lean();
  } catch (err) {
    console.error('Nearest weather lookup failed:', err.message);
    return null;
  }
}

/**
 * Compare report temperature to nearest weather heat index.
 */
export function detectTemperatureAnomaly(reportTemp, weatherHeatIndex) {
  if (reportTemp == null || weatherHeatIndex == null) {
    return false;
  }
  return Math.abs(Number(reportTemp) - Number(weatherHeatIndex)) > ANOMALY_DELTA_C;
}
