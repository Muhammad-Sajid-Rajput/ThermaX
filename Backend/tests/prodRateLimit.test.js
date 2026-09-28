/**
 * Phase 3 proof test: the REAL production auth limiter (the same instance
 * wired onto /login, /refresh, /verify, /forgot-password, /reset-password)
 * actually refuses traffic past its limit. Unlike rateLimit.test.js, this
 * does not build a miniature limiter — it imports middleware/rateLimiters.js
 * with NODE_ENV=production so the production max (30 / 15 min) applies.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

// setup.js forces NODE_ENV=test; override BEFORE importing the limiter
// module so the production (non-dev) branch is evaluated. Vitest gives
// each test file a fresh module registry, so this cannot leak into other
// test files.
process.env.NODE_ENV = 'production';
const { authLimiter } = await import('../middleware/rateLimiters.js');

describe('production auth rate limiter', () => {
  it('returns HTTP 429 once the production request limit is exhausted', async () => {
    const app = express();
    app.post('/login', authLimiter, (req, res) => res.json({ ok: true }));

    // Production max is 30 per 15-minute window: the first 30 pass…
    for (let i = 0; i < 30; i++) {
      const res = await request(app).post('/login');
      expect(res.status).toBe(200);
    }

    // …the 31st is refused.
    const limited = await request(app).post('/login');
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe('Too Many Requests');
  }, 30000);
});
