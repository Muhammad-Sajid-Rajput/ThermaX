import HotspotPublication from '../models/HotspotPublication.js';

/**
 * Phase 5/6: reader filter for the atomic hotspot publication pointer.
 *
 * The ML pipeline publishes hotspot runs per city and flips
 * `hotspot_publications[city].currentRunId` in one atomic upsert, keeping
 * the current + previous runs. Every reader must resolve the pointer first
 * so it sees exactly one complete run per city — never a half-inserted run
 * and never double-counted stale runs.
 *
 * @param {string} [city] - restrict to one city; omit for all cities.
 * @returns {Promise<object>} a Mongo filter matching only hotspots in the
 *   current run(s). Matches nothing (honestly empty) when no publication
 *   exists yet.
 */
export async function currentHotspotRunFilter(city) {
  const pubQuery = city ? { city } : {};
  const pubs = await HotspotPublication.find(pubQuery, {
    city: 1,
    currentRunId: 1,
  }).lean();
  const ors = pubs
    .filter((p) => p && p.currentRunId)
    .map((p) => ({ city: p.city, runId: p.currentRunId }));
  if (ors.length === 0) {
    // No publication yet: match nothing rather than leaking stale runs.
    return { _id: { $in: [] } };
  }
  return { $or: ors };
}
