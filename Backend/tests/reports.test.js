import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { generateAccessToken, generateRefreshTokenString, hashToken } from '../utils/jwt.js';
import { optionalAuth } from '../middleware/auth.js';

async function makeUser(role, tag) {
  const user = await User.create({
    name: `${tag}`,
    email: `${tag}@phase1.test`,
    password: 'Str0ng!Passw0rd',
    role,
    isEmailVerified: true,
  });
  return { user, token: generateAccessToken(user._id, user.role) };
}

describe('report visibility by role (Phase 1 role-case fix)', () => {
  it('admin sees rejected reports; regular user does not', async () => {
    const admin = await makeUser(ROLES.ADMIN, 'admin1');
    const citizen = await makeUser(ROLES.USER, 'citizen1');

    await Report.create({
      user: citizen.user._id,
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 4,
      city: 'Karachi',
      status: 'rejected',
    });

    const asAdmin = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.reports.some((r) => r.status === 'rejected')).toBe(true);

    const asCitizen = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(asCitizen.status).toBe(200);
    expect(asCitizen.body.reports.some((r) => r.status === 'rejected')).toBe(false);
  });

  it('returns 503 (never mock data) when the database is down', async () => {
    const spy = vi
      .spyOn(Report, 'find')
      .mockImplementationOnce(() => {
        throw new Error('db down');
      });
    try {
      const res = await request(app).get('/api/v1/reports');
      expect(res.status).toBe(503);
      // The old mock fallback served a report from "Saddar" — it must be gone.
      expect(JSON.stringify(res.body)).not.toContain('Saddar');
    } finally {
      spy.mockRestore();
    }
  });

  it('rejects report submission without a location', async () => {
    const citizen = await makeUser(ROLES.USER, 'citizen2');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ severity: 4, description: 'no location' });
    expect(res.status).toBe(400);
  });

  it('rejects report submission without a severity', async () => {
    const citizen = await makeUser(ROLES.USER, 'citizen3');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ location: { lat: 24.86, lng: 67.0 }, description: 'no severity' });
    expect(res.status).toBe(400);
  });

  it('stores null (not a fake 38.0) when no temperature is provided', async () => {
    const citizen = await makeUser(ROLES.USER, 'citizen4');
    // Keep enrichment deterministic: no provider call, no snapshot side effects.
    const savedKey = process.env.WEATHER_API_KEY;
    delete process.env.WEATHER_API_KEY;
    try {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${citizen.token}`)
        .send({ location: { lat: 24.86, lng: 67.0 }, severity: 4 });
      expect(res.status).toBe(201);
      expect(res.body.report.ambientTemp).toBeNull();

      const stored = await Report.findById(res.body.report._id);
      expect(stored.ambientTemp).toBeNull();
      expect(stored.isSynthetic).toBe(false);
    } finally {
      if (savedKey !== undefined) process.env.WEATHER_API_KEY = savedKey;
    }
  });
});

describe('Report submit — causes, observedAt, category (Phase 3)', () => {
  it('persists the citizen-supplied causes and observation time', async () => {
    const citizen = await makeUser(ROLES.USER, 'causes1');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({
        location: { lat: 24.86, lng: 67.0 },
        severity: 4,
        causes: ['Lack of trees or shade', 'Hot asphalt or paved roads'],
        observedAt: '2026-09-26T14:30:00',
      });

    expect(res.status).toBe(201);
    const stored = await Report.findById(res.body.report._id);
    expect(stored.causes).toEqual(['Lack of trees or shade', 'Hot asphalt or paved roads']);
    expect(stored.observedAt).toBeInstanceOf(Date);
  });

  it('rejects an observedAt in the future', async () => {
    const citizen = await makeUser(ROLES.USER, 'causes2');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({
        location: { lat: 24.86, lng: 67.0 },
        severity: 3,
        observedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(res.status).toBe(400);
  });

  it('rejects a category outside the closed enum', async () => {
    const citizen = await makeUser(ROLES.USER, 'causes3');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({
        location: { lat: 24.86, lng: 67.0 },
        severity: 3,
        category: 'not_a_real_category',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Category must be one of/);
  });

  it('rejects reports outside the supported cities instead of inventing a city', async () => {
    const citizen = await makeUser(ROLES.USER, 'causes4');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ location: { lat: 0.5, lng: 0.5 }, severity: 2 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/outside our supported cities/);
    expect(await Report.countDocuments()).toBe(0);
  });

  it('resolves the city server-side for coordinates inside a supported city', async () => {
    const citizen = await makeUser(ROLES.USER, 'causes5');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ location: { lat: 31.52, lng: 74.35 }, severity: 3 });
    expect(res.status).toBe(201);
    const stored = await Report.findById(res.body.report._id);
    expect(stored.city).toBe('Lahore');
  });

  it('accepts reports from any location in Pakistan (e.g. Hyderabad)', async () => {
    const citizen = await makeUser(ROLES.USER, 'causes-pk');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ location: { lat: 25.4062, lng: 68.2552 }, areaName: 'Hyderabad Division', severity: 4 });
    expect(res.status).toBe(201);
    const stored = await Report.findById(res.body.report._id);
    expect(stored.city).toBe('Hyderabad');
  });
});

describe('Report lifecycle state machine (Phase 3)', () => {
  async function adminAndReport(status = 'pending') {
    const admin = await makeUser(ROLES.ADMIN, `ladmin-${Date.now()}`);
    const citizen = await makeUser(ROLES.USER, `lcitizen-${Date.now()}`);
    const report = await Report.create({
      user: citizen.user._id,
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 4,
      city: 'Karachi',
      status,
    });
    return { adminToken: admin.token, report };
  }

  it('allows pending → verified → rejected, but rejected is terminal', async () => {
    const { adminToken, report } = await adminAndReport();
    const moderate = (status) =>
      request(app)
        .patch(`/api/v1/reports/${report._id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });

    expect((await moderate('verified')).status).toBe(200);
    expect((await moderate('rejected')).status).toBe(200);

    const resurrected = await moderate('verified');
    expect(resurrected.status).toBe(400);
    expect(resurrected.body.code).toBe('ILLEGAL_STATUS_TRANSITION');
  });

  it('allows pending → flagged → verified', async () => {
    const { adminToken, report } = await adminAndReport();
    const moderate = (status) =>
      request(app)
        .patch(`/api/v1/reports/${report._id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });

    expect((await moderate('flagged')).status).toBe(200);
    const res = await moderate('verified');
    expect(res.status).toBe(200);
    expect(res.body.report.status).toBe('verified');
  });

  it('rejects unknown statuses with 400', async () => {
    const { adminToken, report } = await adminAndReport();
    const res = await request(app)
      .patch(`/api/v1/reports/${report._id}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'archived' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_STATUS');
  });

  it('normalizes legacy statuses (validated → verified) instead of breaking', async () => {
    const { adminToken } = await adminAndReport();
    const legacy = await Report.create({
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 3,
      city: 'Karachi',
      status: 'validated', // pre-Phase-3 value
    });
    expect(legacy.status).toBe('verified'); // normalized on validate

    const res = await request(app)
      .patch(`/api/v1/reports/${legacy._id}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });
    expect(res.status).toBe(200);
  });
});

describe('Report delete policy (Phase 3)', () => {
  async function parties(status = 'pending') {
    const tag = Date.now();
    const citizen = await makeUser(ROLES.USER, `deleter-${tag}`);
    const other = await makeUser(ROLES.USER, `other-${tag}`);
    const admin = await makeUser(ROLES.ADMIN, `dadmin-${tag}`);
    const report = await Report.create({
      user: citizen.user._id,
      userId: citizen.user._id,
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 2,
      city: 'Karachi',
      status,
    });
    return { citizenToken: citizen.token, otherToken: other.token, adminToken: admin.token, report };
  }

  it('lets a citizen delete their own pending report', async () => {
    const { citizenToken, report } = await parties('pending');
    const res = await request(app)
      .delete(`/api/v1/reports/${report._id}`)
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(200);
    expect(await Report.findById(report._id)).toBeNull();
  });

  it('refuses a citizen delete of their own verified report', async () => {
    const { citizenToken, report } = await parties('verified');
    const res = await request(app)
      .delete(`/api/v1/reports/${report._id}`)
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DELETE_ONLY_PENDING');
    expect(await Report.findById(report._id)).not.toBeNull();
  });

  it('refuses a delete of someone else\u2019s report with 403', async () => {
    const { otherToken, report } = await parties('pending');
    const res = await request(app)
      .delete(`/api/v1/reports/${report._id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('lets an admin delete any report', async () => {
    const { adminToken, report } = await parties('verified');
    const res = await request(app)
      .delete(`/api/v1/reports/${report._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(await Report.findById(report._id)).toBeNull();
  });
});

describe('Legacy unverified accounts — defense in depth (Phase 1 gap fix)', () => {
  async function unverifiedUser(tag) {
    return User.create({
      name: `Legacy ${tag}`,
      email: `legacy-${tag}-${Date.now()}@phase1.test`,
      password: 'Str0ng!Passw0rd',
      isEmailVerified: false,
    });
  }

  it('authenticate rejects a token minted for an unverified account', async () => {
    const user = await unverifiedUser('auth');
    const token = generateAccessToken(user._id, user.role);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('refresh rejects a refresh token held by an unverified account', async () => {
    const user = await unverifiedUser('refresh');
    const raw = generateRefreshTokenString();
    await RefreshToken.create({
      user: user._id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${raw}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

describe('Phase 3 remediation re-verification', () => {
  it('rejects an invalid category at the API boundary with 400', async () => {
    const citizen = await makeUser(ROLES.USER, 'catapi1');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ location: { lat: 24.86, lng: 67.0 }, severity: 3, category: 'not_a_category' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid category at the Mongoose schema level', async () => {
    const citizen = await makeUser(ROLES.USER, 'catschema1');
    await expect(
      Report.create({
        user: citizen.user._id,
        latitude: 24.86,
        longitude: 67.0,
        severityLevel: 3,
        category: 'not_a_category',
      })
    ).rejects.toThrow(/validation/i);
  });

  it('optionalAuth does not attach a session for an unverified user (legacy token)', async () => {
    const user = await User.create({
      name: 'legacy-unverified',
      email: 'legacy-unverified@phase3.test',
      password: 'Str0ng!Passw0rd',
      role: ROLES.USER,
      isEmailVerified: false,
    });
    const token = generateAccessToken(user._id, user.role);
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    await optionalAuth(req, {}, () => {});
    expect(req.user ?? null).toBeNull();
  });

  it('optionalAuth still attaches a session for a verified user', async () => {
    const { user, token } = await makeUser(ROLES.USER, 'verified-opt');
    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    await optionalAuth(req, {}, () => {});
    expect(String(req.user._id)).toBe(String(user._id));
  });

  it('deleting a report removes the document from the database', async () => {
    const admin = await makeUser(ROLES.ADMIN, `delreport-admin-${Date.now()}`);
    const citizen = await makeUser(ROLES.USER, `delreport-cit-${Date.now()}`);
    const report = await Report.create({
      user: citizen.user._id,
      latitude: 24.86,
      longitude: 67.0,
      severityLevel: 3,
      city: 'Karachi',
      status: 'pending',
    });

    const res = await request(app)
      .delete(`/api/v1/reports/${report._id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(await Report.findById(report._id)).toBeNull();
  });
});
