/**
 * DB error helpers — distinguish a database/connection failure (HTTP 503)
 * from a genuine unexpected bug (HTTP 500).
 *
 * Phase 2 rule: an unavailable data source must be answered honestly with
 * 503, never silently replaced with invented data or a generic 500.
 */

/**
 * True when the error looks like a MongoDB / Mongoose / connection failure.
 */
export function isDatabaseError(error) {
  if (!error) return false;
  const name = error.name || '';
  if (
    name === 'MongoServerError' ||
    name === 'MongooseError' ||
    name === 'MongoNetworkError' ||
    name === 'MongoNetworkTimeoutError' ||
    name === 'MongoTimeoutError' ||
    name === 'MongoTopologyClosedError'
  ) {
    return true;
  }
  return /connect|ECONNREFUSED|timed out|timeout|topology/i.test(error.message || '');
}

/**
 * 503 for DB/connection failures, 500 for everything else.
 */
export function dbFailureStatus(error) {
  return isDatabaseError(error) ? 503 : 500;
}

export default { isDatabaseError, dbFailureStatus };
