import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { User, ROLES } from '../models/User.js';
import mongoose from 'mongoose';
import { generateAccessToken } from '../utils/jwt.js';
import * as weatherService from '../services/weatherService.js';
import * as mlServiceClient from '../services/mlServiceClient.js';

async function makeCitizen(tag) {
  const user = await User.create({
    name: tag,
    email: `${tag}@enrichorder.test`,
    password: 'Test123!',
    role: ROLES.USER,
    isEmailVerified: true,
  });
  return { user, token: generateAccessToken(user._id, user.role) };
}

const flush = async (n = 5) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
};

describe('submit path — weather settles before ML enrichment (pre-Phase-6 review)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not trigger ML enrichment until the weather snapshot settles', async () => {
    let resolveWeather;
    const weatherGate = new Promise((resolve) => {
      resolveWeather = resolve;
    });
    const weatherSpy = vi
      .spyOn(weatherService, 'enrichAndSaveSnapshot')
      .mockImplementation(() => weatherGate);
    const mlSpy = vi
      .spyOn(mlServiceClient, 'triggerReportEnrichment')
      .mockImplementation(() => ({ ok: true }));

    const { token } = await makeCitizen('ordercitizen');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .field(
        'reportData',
        JSON.stringify({
          latitude: 24.86,
          longitude: 67.0,
          severityLevel: 4,
          city: 'Karachi',
          description: 'Ordering test report',
        })
      );
    expect(res.status).toBe(201);
    expect(weatherSpy).toHaveBeenCalledTimes(1);

    // Weather still in flight → ML must not have fired yet.
    await flush();
    expect(mlSpy).not.toHaveBeenCalled();

    // Weather settles (explicitly unavailable → null) → ML fires exactly once.
    resolveWeather(null);
    await flush();
    expect(mlSpy).toHaveBeenCalledTimes(1);
    expect(String(mlSpy.mock.calls[0][0])).toBe(String(res.body.report._id));
  });

  it('still triggers ML enrichment when the weather snapshot succeeds', async () => {
    const fakeSnapshot = { _id: new mongoose.Types.ObjectId() };
    vi.spyOn(weatherService, 'enrichAndSaveSnapshot').mockResolvedValue(fakeSnapshot);
    const mlSpy = vi
      .spyOn(mlServiceClient, 'triggerReportEnrichment')
      .mockImplementation(() => ({ ok: true }));

    const { token } = await makeCitizen('ordercitizen2');
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .field(
        'reportData',
        JSON.stringify({
          latitude: 24.861,
          longitude: 67.001,
          severityLevel: 3,
          city: 'Karachi',
          description: 'Ordering test report 2',
        })
      );
    expect(res.status).toBe(201);
    await flush();
    expect(mlSpy).toHaveBeenCalledTimes(1);
  });
});
