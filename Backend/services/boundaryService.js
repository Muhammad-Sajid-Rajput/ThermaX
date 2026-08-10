import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let boundaryFeatures = [];

// Load district boundaries
try {
  const geojsonPath = path.join(__dirname, '../data/boundaries/pk_districts.geojson');
  if (fs.existsSync(geojsonPath)) {
    const raw = fs.readFileSync(geojsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    boundaryFeatures = parsed.features || [];
  }
} catch (err) {
  console.warn('Boundary GeoJSON loading warning:', err.message);
}

/**
 * Standard Ray-Casting Point-in-Polygon Algorithm
 * Checks if point (lng, lat) is inside polygon coordinates [[lng, lat], ...]
 */
function isPointInPolygon(point, polygon) {
  const [lng, lat] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Server-side District & Area Resolution
 */
export function resolveDistrictAndCity(lat, lng) {
  const point = [Number(lng), Number(lat)];

  for (const feature of boundaryFeatures) {
    const coords = feature.geometry?.coordinates?.[0];
    if (coords && isPointInPolygon(point, coords)) {
      return {
        district: feature.properties?.district || 'Karachi Urban',
        areaName: feature.properties?.name || 'Karachi Central',
        city: 'Karachi',
      };
    }
  }

  // Fallback default for points outside exact polygon bounds
  return {
    district: 'Karachi Urban',
    areaName: 'Karachi Metro',
    city: 'Karachi',
  };
}

export default { resolveDistrictAndCity };
