import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('health & routing', () => {
  it('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.apiVersion).toBe('v1');
  });

  it('GET /api/v1/health returns OK', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});
