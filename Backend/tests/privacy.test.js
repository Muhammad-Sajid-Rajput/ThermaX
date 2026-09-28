import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { Report } from '../models/Report.js';
import { generateAccessToken } from '../utils/jwt.js';

async function makeUser(role, tag) {
  const user = await User.create({
    name: tag,
    email: `${tag}@privacy.test`,
password: 'Test123!',
    role,
    isEmailVerified: true,
  });
  return { user, token: generateAccessToken(user._id, user.role) };
}

async function makeReport(user, overrides = {}) {
  return Report.create({
    user: user._id,
    latitude: 24.8607,
    longitude: 67.0011,
    snappedLocation: { lat: 24.861, lng: 67.001 },
    severityLevel: 4,
    city: 'Karachi',
    areaName: 'Gulshan-e-Iqbal',
    status: 'verified',
    ...overrides,
  });
}

describe('public report privacy DTO (pre-Phase-6 review)', () => {
  it('public GET /reports exposes snapped location, never exact coordinates or reporter identity', async () => {
    const citizen = await makeUser(ROLES.USER, 'privcitizen');
    await makeReport(citizen.user);

    const res = await request(app).get('/api/v1/reports');
    expect(res.status).toBe(200);
    expect(res.body.reports.length).toBeGreaterThan(0);
    const dto = res.body.reports[0];
    // Exact GPS must not leak…
    expect(dto.latitude).toBeUndefined();
    expect(dto.longitude).toBeUndefined();
    expect(dto.coordinates).toBeUndefined();
    // …nor reporter identity…
    expect(dto.user).toBeUndefined();
    expect(dto.userId).toBeUndefined();
    expect(dto.deviceId).toBeUndefined();
    // …but the anonymized pin and public fields survive.
    expect(dto.location).toEqual({ lat: 24.861, lng: 67.001 });
    expect(dto.city).toBe('Karachi');
    expect(dto.severity).toBe(4);
    expect(dto.area).toBe('Gulshan-e-Iqbal');
  });

  it('admin GET /:id returns the full report; citizens are refused', async () => {
    const admin = await makeUser(ROLES.ADMIN, 'privadmin');
    const citizen = await makeUser(ROLES.USER, 'privcitizen2');
    const report = await makeReport(citizen.user);

    const asAdmin = await request(app)
      .get(`/api/v1/report/${report._id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(asAdmin.status).toBe(200);
    expect(String(asAdmin.body.report._id)).toBe(String(report._id));

    const asCitizen = await request(app)
      .get(`/api/v1/report/${report._id}`)
      .set('Authorization', `Bearer ${citizen.token}`);
    expect(asCitizen.status).toBe(403);

    const anon = await request(app).get(`/api/v1/report/${report._id}`);
    expect(anon.status).toBe(401);
  });

  it('public DTO never carries a populated user even when one exists', async () => {
    const citizen = await makeUser(ROLES.USER, 'privcitizen3');
    await makeReport(citizen.user);
    const res = await request(app).get('/api/v1/reports');
    const raw = JSON.stringify(res.body.reports);
    expect(raw).not.toContain('privcitizen3');
    expect(raw).not.toContain('@privacy.test');
  });

  it('public callers cannot bypass moderation with ?status=rejected (or flagged)', async () => {
    const admin = await makeUser(ROLES.ADMIN, 'modadmin');
    const citizen = await makeUser(ROLES.USER, 'modcitizen');
    const rejected = await makeReport(citizen.user, { status: 'rejected' });
    const flagged = await makeReport(citizen.user, { status: 'flagged' });

    // Default public listing hides both.
    const pub = await request(app).get('/api/v1/reports');
    const ids = pub.body.reports.map((r) => String(r.id));
    expect(ids).not.toContain(String(rejected._id));
    expect(ids).not.toContain(String(flagged._id));

    // Explicit ?status= bypass attempts are refused, not honored.
    for (const s of ['rejected', 'flagged']) {
      const res = await request(app).get(`/api/v1/reports?status=${s}`);
      expect(res.status).toBe(400);
    }

    // Admins can still filter by moderation statuses.
    const asAdmin = await request(app)
      .get('/api/v1/reports?status=rejected')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.reports.map((r) => String(r._id))).toContain(String(rejected._id));
  });

  it('public listing excludes synthetic rows; admins still see them', async () => {
    const admin = await makeUser(ROLES.ADMIN, 'synadmin');
    const citizen = await makeUser(ROLES.USER, 'syncitizen2');
    const synth = await makeReport(citizen.user, { isSynthetic: true });

    const pub = await request(app).get('/api/v1/reports');
    expect(pub.body.reports.map((r) => String(r.id))).not.toContain(String(synth._id));

    const asAdmin = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(asAdmin.body.reports.map((r) => String(r._id))).toContain(String(synth._id));
    await synth.deleteOne();
  });
});
