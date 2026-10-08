/**
 * Normalizes city names for display and querying (e.g. "karachi" -> "Karachi").
 * Supports any location across Pakistan.
 */
export function normalizeCity(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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

