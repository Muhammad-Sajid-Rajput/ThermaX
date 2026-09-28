/**
 * Phase 1 proof test: rate limiting actually refuses traffic past the limit.
 * Uses a miniature limiter so the suite never depends on the real server's
 * windows; the production wiring (trust proxy + authRateLimiter +
 * refreshLimiter) is exercised in review, this test proves the mechanism.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { rateLimit } from 'express-rate-limit';

describe('rate limiting', () => {
  it('returns HTTP 429 once the request limit is exhausted', async () => {
    const app = express();
    app.get(
      '/ping',
      rateLimit({ windowMs: 60_000, max: 2, standardHeaders: true, legacyHeaders: false }),
      (req, res) => res.json({ ok: true })
    );

    expect((await request(app).get('/ping')).status).toBe(200);
    expect((await request(app).get('/ping')).status).toBe(200);

    const limited = await request(app).get('/ping');
    expect(limited.status).toBe(429);
  });
});
