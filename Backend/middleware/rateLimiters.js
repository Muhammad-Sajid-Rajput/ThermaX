import { rateLimit } from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const isLocalRequest = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.includes('localhost')
  );
};


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 30,
  skip: (req) => isDev && isLocalRequest(req),
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API Limiter
 * In dev: skipped for local requests (up to 50,000 for remote); In prod: 2,500 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50000 : 2500,
  skip: (req) => isDev && isLocalRequest(req),
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down your requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive state-changing operations
 * In dev: 1,000 requests; In prod: 100 requests per 15-minute window
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  skip: (req) => isDev && isLocalRequest(req),
  message: {
    error: 'Too Many Requests',
    message: 'Action rate limit exceeded. Please wait before retrying.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
