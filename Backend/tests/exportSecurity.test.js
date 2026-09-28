import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { generateAccessToken } from '../utils/jwt.js';

async function makeAdmin(tag) {
  const user = await User.create({
    name: `ExportAdmin ${tag}`,
    email: `export-admin-${tag}@export.test`,
    password: 'Str0ng!Passw0rd',
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });
  return generateAccessToken(user._id, user.role);
}

describe('export routes — admin-only auth', () => {
  it('rejects unauthenticated GET /history with 401', async () => {
    const res = await request(app).get('/api/v1/exports/history');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated POST /generate with 401', async () => {
    const res = await request(app).post('/api/v1/exports/generate').send({ city: 'Karachi' });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated traversal download with 401 (auth runs first)', async () => {
    const res = await request(app).get('/api/v1/exports/download/..%2F..%2Fpackage.json');
    expect(res.status).toBe(401);
  });

  it('lets an authenticated admin read export history', async () => {
    const token = await makeAdmin('history');
    const res = await request(app)
      .get('/api/v1/exports/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
    expect(res.body.count).toBe(0);
  });
});

describe('export download — path traversal', () => {
  it('rejects an authenticated traversal download with 400', async () => {
    const token = await makeAdmin('traversal');
    const res = await request(app)
      .get('/api/v1/exports/download/..%2Ftest')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid filename/);
  });

  it('returns 404 (not a filesystem leak) for a plain missing file', async () => {
    const token = await makeAdmin('missing');
    const res = await request(app)
      .get('/api/v1/exports/download/no-such-file.html')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('export generate — city validation', () => {
  it('rejects a path-traversal city with 400', async () => {
    const token = await makeAdmin('citypath');
    const res = await request(app)
      .post('/api/v1/exports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: '../../x' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing city with 400 (no Karachi default)', async () => {
    const token = await makeAdmin('citymissing');
    const res = await request(app)
      .post('/api/v1/exports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'csv' });
    expect(res.status).toBe(400);
  });

  it('rejects a city that slugifies to nothing with 400', async () => {
    const token = await makeAdmin('cityempty');
    const res = await request(app)
      .post('/api/v1/exports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: '!!!' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/reports/generate — honest 501', () => {
  it('returns 501 instead of a fabricated reportId', async () => {
    const token = await makeAdmin('repgen');
    const res = await request(app)
      .post('/api/v1/reports/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'PDF' });
    expect(res.status).toBe(501);
    expect(res.body.reportId).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Completed');
  });

  it('still requires auth (401 without a token)', async () => {
    const res = await request(app).post('/api/v1/reports/generate').send({ type: 'PDF' });
    expect(res.status).toBe(401);
  });
});
