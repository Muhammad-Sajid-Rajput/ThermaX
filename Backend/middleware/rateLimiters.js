import { rateLimit } from 'express-rate-limit';

/**
 * Strict limiter for Auth endpoints (Login / Signup / Password reset)
 * Limits each IP to 5 requests per 15-minute window
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API Limiter
 * Limits each IP to 100 requests per 15-minute window
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down your requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive state-changing operations
 * Limits each IP to 10 requests per 15-minute window
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Action rate limit exceeded. Please wait before retrying.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
