import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import { generateAccessToken } from '../utils/jwt.js';
import { triggerReportEnrichment } from '../services/mlServiceClient.js';
import EnrichmentFailure from '../models/EnrichmentFailure.js';

async function makeAdmin(tag) {
  const user = await User.create({
    name: `AdminOps ${tag}`,
    email: `adminops-${tag}@adminops.test`,
    password: 'AdminOps-2026!',
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });
  return generateAccessToken(user._id, user.role);
}

async function makeCitizen(tag) {
  const user = await User.create({
    name: `CitizenOps ${tag}`,
    email: `citizenops-${tag}@adminops.test`,
    password: 'CitizenOps-2026!',
    role: ROLES.CITIZEN,
    isEmailVerified: true,
  });
  return generateAccessToken(user._id, user.role);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const okResponse = () => Promise.resolve({ ok: true, status: 202 });

describe('mlServiceClient — retry with backoff and dead letter', () => {
  it('succeeds on the third attempt after two failures (no dead letter)', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockImplementationOnce(okResponse);
    vi.stubGlobal('fetch', fetchMock);

    const reportId = new mongoose.Types.ObjectId();
    const result = await triggerReportEnrichment(reportId);

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await EnrichmentFailure.countDocuments({ report: reportId })).toBe(0);
  });

  it('persists a dead letter after 3 failed attempts instead of swallowing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ML service down')));

    const reportId = new mongoose.Types.ObjectId();
    const result = await triggerReportEnrichment(reportId);

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    const failure = await EnrichmentFailure.findOne({ report: reportId, status: 'open' });
    expect(failure).not.toBeNull();
    expect(failure.attempts).toBe(3);
    expect(failure.lastError).toContain('ML service down');
  });

  it('marks the open dead letter resolved when a later trigger succeeds', async () => {
    const reportId = new mongoose.Types.ObjectId();
    await EnrichmentFailure.create({ report: reportId, attempts: 3, lastError: 'boom', status: 'open' });

    vi.stubGlobal('fetch', vi.fn().mockImplementation(okResponse));
    const result = await triggerReportEnrichment(reportId);

    expect(result.ok).toBe(true);
    const failure = await EnrichmentFailure.findOne({ report: reportId });
    expect(failure.status).toBe('resolved');
    expect(failure.resolvedAt).not.toBeNull();
  });

  it('sends the X-Service-Key header when ML_SERVICE_KEY is configured', async () => {
    process.env.ML_SERVICE_KEY = 'test-shared-secret';
    const fetchMock = vi.fn().mockImplementation(okResponse);
    vi.stubGlobal('fetch', fetchMock);

    await triggerReportEnrichment(new mongoose.Types.ObjectId());

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['X-Service-Key']).toBe('test-shared-secret');
    delete process.env.ML_SERVICE_KEY;
  });
});

describe('admin enrichment-failures endpoints', () => {
  it('admin can list, retry and dismiss open failures; citizens are refused', async () => {
    const adminToken = await makeAdmin('list');
    const citizenToken = await makeCitizen('list');
    const reportId = new mongoose.Types.ObjectId();
    const failure = await EnrichmentFailure.create({
      report: reportId, attempts: 3, lastError: 'ML service down', status: 'open',
    });

    // Citizen: refused.
    await request(app)
      .get('/api/v1/admin/enrichment-failures')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(403);

    // Admin: lists the open failure.
    const listRes = await request(app)
      .get('/api/v1/admin/enrichment-failures')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body.failures).toHaveLength(1);
    expect(listRes.body.failures[0]._id).toBe(String(failure._id));

    // Admin: retry re-queues (ML mocked healthy here) → auto-resolved.
    vi.stubGlobal('fetch', vi.fn().mockImplementation(okResponse));
    await request(app)
      .post(`/api/v1/admin/enrichment-failures/${failure._id}/retry`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Wait for the fire-and-forget retry loop to finish and resolve it.
    await vi.waitFor(async () => {
      const f = await EnrichmentFailure.findById(failure._id);
      expect(f.status).toBe('resolved');
    });

    // Admin: dismiss closes a still-open failure; it leaves the open list.
    const failure2 = await EnrichmentFailure.create({
      report: new mongoose.Types.ObjectId(), attempts: 3, lastError: 'down', status: 'open',
    });
    await request(app)
      .post(`/api/v1/admin/enrichment-failures/${failure2._id}/dismiss`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const after = await request(app)
      .get('/api/v1/admin/enrichment-failures')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(after.body.failures).toHaveLength(0);
  });

  it('dismissing a non-open failure returns 404, not a fabricated success', async () => {
    const adminToken = await makeAdmin('dismiss404');
    const missing = new mongoose.Types.ObjectId();
    await request(app)
      .post(`/api/v1/admin/enrichment-failures/${missing}/dismiss`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
