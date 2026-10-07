// Phase 5: canonical server-side city resolution.
//
// The supported cities (name, center, bbox, timezone) are
// defined ONCE in Backend/data/cities.json — the same file the ML service
// reads — so the backend and ML can never disagree about what "Karachi"
// means.
//
// Uniform Bounding Box model (Pakistan-wide scope, 12 cities):
// All cities resolve via their metropolitan bounding boxes. Points inside
// a bbox resolve to that city. In cases of overlapping metro bboxes
// (e.g. nearby Gujranwala / Sialkot), ties are broken deterministically
// by the nearest city center. Points outside every bbox are rejected (HTTP 400).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

let cityDefs = [];

function loadCities() {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'cities.json'), 'utf8');
    const parsed = JSON.parse(raw);
    cityDefs = parsed.cities || [];
  } catch (err) {
    console.warn('cities.json loading warning:', err.message);
    cityDefs = [];
  }
}

loadCities();

/**
 * Standard ray-casting point-in-polygon helper. Point is [lng, lat].
 * Kept for GIS utility / backwards compatibility.
 */
export function isPointInPolygon(point, polygon) {
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
 * Supported city definitions (name, slug, center, bbox, timezone).
 */
export function getCities() {
  return cityDefs.map((c) => ({
    name: c.name,
    slug: c.slug,
    center: c.center,
    bbox: c.bbox,
    timezone: c.timezone,
  }));
}

/**
 * Resolve (lat, lng) to a supported city name, or null when the point is
 * outside every known city bounding box. Server-side only — the client never
 * decides its own city.
 *
 * Checks all 12 cities against their metro bounding boxes. Overlapping
 * bboxes resolve deterministically to the nearest city center.
 */
export function resolveCity(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;

  let best = null;
  for (const city of cityDefs) {
    const b = city.bbox;
    if (
      b &&
      lngNum >= b.minLng &&
      lngNum <= b.maxLng &&
      latNum >= b.minLat &&
      latNum <= b.maxLat
    ) {
      const dLat = latNum - (city.center?.lat ?? 0);
      const dLng = lngNum - (city.center?.lng ?? 0);
      const distSq = dLat * dLat + dLng * dLng;
      if (!best || distSq < best.distSq) best = { name: city.name, distSq };
    }
  }
  return best ? best.name : null;
}

/**
 * Backwards-compatible district/area resolution. District-level boundaries
 * are not shipped in Phase 5, so district is honestly null; areaName falls
 * back to the matched city name.
 */
export function resolveDistrictAndCity(lat, lng) {
  const city = resolveCity(lat, lng);
  if (!city) {
    return { district: null, areaName: null, city: null, outsideKnownBoundaries: true };
  }
  return { district: null, areaName: city, city, outsideKnownBoundaries: false };
}

export default { getCities, resolveCity, resolveDistrictAndCity, isPointInPolygon };
