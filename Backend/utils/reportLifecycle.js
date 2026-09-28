/**
 * Report lifecycle state machine — the single source of truth.
 *
 * A citizen report is born `pending`. Enrichment + QC (Phase 3) moves it to
 * `verified` (checks passed) or `flagged` (checks suspect). Admins can then
 * verify, flag, or reject. `rejected` is terminal: a rejected report is never
 * silently resurrected — the citizen must submit a new report.
 *
 * Allowed transitions:
 *   pending  → verified | flagged | rejected
 *   flagged  → verified | rejected
 *   verified → flagged   | rejected
 *   rejected → (terminal)
 *
 * Legacy values written before Phase 3 (`validated`, `anomaly`) are
 * normalized to the new vocabulary on read/write, never rejected outright.
 */

export const REPORT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FLAGGED: 'flagged',
  REJECTED: 'rejected',
};

const ALL_STATUSES = Object.values(REPORT_STATUS);

export const ALLOWED_TRANSITIONS = {
  [REPORT_STATUS.PENDING]: [REPORT_STATUS.VERIFIED, REPORT_STATUS.FLAGGED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.FLAGGED]: [REPORT_STATUS.VERIFIED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.VERIFIED]: [REPORT_STATUS.FLAGGED, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.REJECTED]: [],
};

/** Values stored by older versions, mapped to the current vocabulary. */
export const LEGACY_STATUS_MAP = {
  validated: REPORT_STATUS.VERIFIED,
  anomaly: REPORT_STATUS.FLAGGED,
};

/**
 * Normalize any stored or incoming status value to the current vocabulary.
 * Unknown values pass through unchanged so callers can reject them loudly.
 */
export function normalizeStatus(status) {
  if (status == null) return status;
  const s = String(status).toLowerCase().trim();
  if (ALL_STATUSES.includes(s)) return s;
  if (Object.prototype.hasOwnProperty.call(LEGACY_STATUS_MAP, s)) {
    return LEGACY_STATUS_MAP[s];
  }
  return s;
}

export function isKnownStatus(status) {
  return ALL_STATUSES.includes(normalizeStatus(status));
}

export function canTransition(from, to) {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (!ALL_STATUSES.includes(f) || !ALL_STATUSES.includes(t)) return false;
  return (ALLOWED_TRANSITIONS[f] || []).includes(t);
}

export class StatusTransitionError extends Error {
  constructor(from, to) {
    super(
      `Illegal report status transition: ${normalizeStatus(from)} → ${normalizeStatus(to)}. ` +
        `Allowed: ${(ALLOWED_TRANSITIONS[normalizeStatus(from)] || []).join(', ') || '(none — terminal)'}`
    );
    this.name = 'StatusTransitionError';
    this.statusCode = 400;
    this.code = 'ILLEGAL_STATUS_TRANSITION';
  }
}

export class UnknownStatusError extends Error {
  constructor(status) {
    super(
      `Unknown report status: ${status}. ` +
        `Known statuses: ${ALL_STATUSES.join(', ')}`
    );
    this.name = 'UnknownStatusError';
    this.statusCode = 400;
    this.code = 'UNKNOWN_STATUS';
  }
}

/**
 * Validate a requested transition. Returns the normalized target status.
 * Throws StatusTransitionError (illegal move) or UnknownStatusError.
 */
export function assertTransition(from, to) {
  const target = normalizeStatus(to);
  if (!ALL_STATUSES.includes(target)) {
    throw new UnknownStatusError(to);
  }
  if (!canTransition(from, to)) {
    throw new StatusTransitionError(from, to);
  }
  return target;
}
