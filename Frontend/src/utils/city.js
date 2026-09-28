/**
 * Normalize a free-text city name (e.g. from reverse geocoding) to one of
 * ThermaX's supported cities. Returns null when the name doesn't match —
 * callers must then skip city-scoped requests rather than guess.
 */
export const SUPPORTED_CITIES = ['Karachi', 'Lahore', 'Islamabad'];

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
// Backward-compatible fallback exports for stale client HMR / browser cache
export const CITY_PRESETS = [];
export const getCityForCoordinates = () => null;

const ALIASES = {
  karachi: 'Karachi',
  lahore: 'Lahore',
  islamabad: 'Islamabad',
  'islamabad capital territory': 'Islamabad',
};

export function normalizeCity(name) {
  if (!name || typeof name !== 'string') return null;
  const key = name.trim().toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const direct = SUPPORTED_CITIES.find((c) => c.toLowerCase() === key);
  return direct || null;
}

/** Risk-tier rank for "highest tier" selection (higher = more severe). */
export const TIER_RANK = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  unknown: 0,
};

export function highestTier(hotspots) {
  let best = null;
  let bestRank = -1;
  for (const h of hotspots || []) {
    const rank = TIER_RANK[h.riskTier] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = h;
    }
  }
  return best;
}
