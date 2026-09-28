// Phase 5: canonical server-side city resolution.
//
// The supported cities (name, boundary polygon, center, timezone) are
// defined ONCE in Backend/data/cities.json — the same file the ML service
// reads — so the backend and ML can never disagree about what "Karachi"
// means. Boundary polygons are OSM administrative relations (simplified),
// stored per city under Backend/data/boundaries/.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

let cityDefs = [];
let cityPolygons = new Map(); // city name -> array of rings [[[lng,lat],...]]

function loadCities() {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'cities.json'), 'utf8');
    const parsed = JSON.parse(raw);
    cityDefs = parsed.cities || [];
  } catch (err) {
    console.warn('cities.json loading warning:', err.message);
    cityDefs = [];
  }
  cityPolygons = new Map();
  for (const city of cityDefs) {
    try {
      const geoPath = path.join(DATA_DIR, city.boundaryFile);
      const gj = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
      const rings = [];
      for (const feature of gj.features || []) {
        const geom = feature.geometry;
        if (!geom) continue;
        if (geom.type === 'Polygon') {
          for (const ring of geom.coordinates) rings.push(ring);
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates)
            for (const ring of poly) rings.push(ring);
        }
      }
      cityPolygons.set(city.name, rings);
    } catch (err) {
      console.warn(`Boundary load warning for ${city.name}:`, err.message);
    }
  }
}

loadCities();

/**
 * Standard ray-casting point-in-polygon. Point is [lng, lat].
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
 * outside every known city boundary. Server-side only — the client never
 * decides its own city.
 */
export function resolveCity(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;
  const point = [lngNum, latNum];
  for (const city of cityDefs) {
    const rings = cityPolygons.get(city.name) || [];
    for (const ring of rings) {
      if (ring.length >= 4 && isPointInPolygon(point, ring)) {
        return city.name;
      }
    }
  }
  return null;
}

export const PAKISTAN_BOUNDS = {
  minLat: 23.0,
  maxLat: 37.5,
  minLng: 60.5,
  maxLng: 78.0,
};

export function isLocationInPakistan(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return false;
  return (
    latNum >= PAKISTAN_BOUNDS.minLat &&
    latNum <= PAKISTAN_BOUNDS.maxLat &&
    lngNum >= PAKISTAN_BOUNDS.minLng &&
    lngNum <= PAKISTAN_BOUNDS.maxLng
  );
}

/**
 * Backwards-compatible district/area resolution.
 */
export function resolveDistrictAndCity(lat, lng, areaName = null) {
  const city = resolveCity(lat, lng);
  if (!city) {
    const isPk = isLocationInPakistan(lat, lng);
    return {
      district: areaName && areaName.includes('Division') ? areaName : null,
      areaName: areaName || (isPk ? 'Pakistan' : null),
      city: areaName || (isPk ? 'Pakistan' : null),
      outsideKnownBoundaries: !isPk,
    };
  }
  return { district: null, areaName: city, city, outsideKnownBoundaries: false };
}

export default {
  getCities,
  resolveCity,
  resolveDistrictAndCity,
  isPointInPolygon,
  isLocationInPakistan,
  PAKISTAN_BOUNDS,
};
