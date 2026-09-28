/**
 * Strict environment access.
 *
 * Secrets must never have fallback defaults: a missing secret is a fatal
 * boot error, not a silent downgrade to a well-known value.
 */

export function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT signing secret is not set. ' +
        'Set JWT_ACCESS_SECRET (or JWT_SECRET) and restart. ' +
        'Refusing to run without a signing secret.'
    );
  }
  return secret;
}

/** Call once at boot; throws if required secrets are missing. */
export function assertRequiredEnv() {
  getJwtSecret();
}
