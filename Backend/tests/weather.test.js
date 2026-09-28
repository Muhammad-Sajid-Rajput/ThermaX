import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import {
  getCurrentWeather,
  normalize,
  enrichAndSaveSnapshot,
  getWeatherHistory,
  ConfigError,
  WeatherApiError,
} from '../services/weatherService.js';
import { WeatherSnapshot } from '../models/WeatherSnapshot.js';
import { Report } from '../models/Report.js';

const LAT = 24.86;
const LNG = 67.0;

function withoutApiKey() {
  const saved = process.env.WEATHER_API_KEY;
  delete process.env.WEATHER_API_KEY;
  return () => {
    if (saved !== undefined) process.env.WEATHER_API_KEY = saved;
  };
}

describe('weather service (Phase 2: never fabricate)', () => {
  it('throws ConfigError instead of fake data when the API key is missing', async () => {
    const restore = withoutApiKey();
    try {
      await expect(
        getCurrentWeather(LAT, LNG, { bypassCache: true })
      ).rejects.toThrow(ConfigError);
    } finally {
      restore();
    }
  });

  it('normalize rejects incomplete provider payloads', () => {
    expect(() => normalize({}, LAT, LNG)).toThrow(WeatherApiError);
    expect(() => normalize({ current: { temp_c: 41.5 } }, LAT, LNG)).toThrow(WeatherApiError);
  });

  it('normalize keeps real measurements and marks provenance', () => {
    const dto = normalize(
      {
        current: { temp_c: 41.5, humidity: 38, feelslike_c: 43.0 },
        location: { name: 'Karachi', country: 'Pakistan', lat: LAT, lon: LNG },
      },
      LAT,
      LNG
    );
    expect(dto.temperature).toBe(41.5);
    expect(dto.isSynthetic).toBe(false);
    expect(dto.status).toBe('ok');
    expect(dto.source).toBe('weatherapi');
  });

  it('enrichment persists nothing when weather is unavailable', async () => {
    const restore = withoutApiKey();
    try {
      const snapshot = await enrichAndSaveSnapshot(
        new mongoose.Types.ObjectId(),
        LAT,
        LNG
      );
      expect(snapshot).toBeNull();
      expect(await WeatherSnapshot.countDocuments()).toBe(0);
    } finally {
      restore();
    }
  });

  it('GET /weather/current returns 503 (not fake 38°C) when unconfigured', async () => {
    const restore = withoutApiKey();
    try {
      const res = await request(app).get(
        `/api/v1/weather/current?lat=${LAT}&lng=${LNG}`
      );
      expect(res.status).toBe(503);
      expect(res.body.temperature).toBeUndefined();
    } finally {
      restore();
    }
  });

  it('enrichment preserves the provider observation time as observedAt', async () => {
    const realFetch = globalThis.fetch;
    const providerLocaltime = '2026-09-27 10:30';
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        location: {
          name: 'Karachi',
          country: 'Pakistan',
          lat: LAT,
          lon: LNG,
          localtime: providerLocaltime,
        },
        current: {
          temp_c: 40.1,
          humidity: 35,
          feelslike_c: 42.0,
          uv: 8,
          wind_kph: 12,
          condition: { text: 'Sunny' },
        },
      }),
    });
    const savedKey = process.env.WEATHER_API_KEY;
    process.env.WEATHER_API_KEY = 'test-key';
    try {
      const reportId = new mongoose.Types.ObjectId();
      // Unique coords dodge the in-memory weather cache from other tests.
      const snapshot = await enrichAndSaveSnapshot(reportId, 24.8601, 67.0001);
      expect(snapshot).not.toBeNull();
      // observedAt carries the PROVIDER's timestamp through the upsert —
      // it must not be dropped (the old model had no such field).
      expect(snapshot.observedAt).not.toBeNull();
      expect(new Date(snapshot.observedAt).toISOString()).toBe(
        new Date(providerLocaltime).toISOString()
      );
      expect(snapshot.fetchedAt).not.toBeNull();
      await WeatherSnapshot.deleteOne({ _id: snapshot._id });
    } finally {
      globalThis.fetch = realFetch;
      if (savedKey === undefined) delete process.env.WEATHER_API_KEY;
      else process.env.WEATHER_API_KEY = savedKey;
    }
  });
});

describe('weather snapshot idempotency (Phase 3 re-verification)', () => {
  it('concurrent triggers and reruns upsert exactly one snapshot per report', async () => {
    const savedKey = process.env.WEATHER_API_KEY;
    const savedFetch = globalThis.fetch;
    process.env.WEATHER_API_KEY = 'test-key';
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        current: { temp_c: 38.5, humidity: 45, feelslike_c: 40.1 },
        location: { name: 'Karachi', country: 'Pakistan', lat: LAT, lon: LNG },
      }),
    });
    try {
      const reportId = new mongoose.Types.ObjectId();
      // Simulate the submit-time race: weather enrichment and the ML
      // trigger fire at the same time.
      await Promise.all([
        enrichAndSaveSnapshot(reportId, LAT, LNG),
        enrichAndSaveSnapshot(reportId, LAT, LNG),
      ]);
      // And a later rerun must not create a second row either.
      await enrichAndSaveSnapshot(reportId, LAT, LNG);
      expect(await WeatherSnapshot.countDocuments({ report: reportId })).toBe(1);
    } finally {
      globalThis.fetch = savedFetch;
      if (savedKey === undefined) delete process.env.WEATHER_API_KEY;
      else process.env.WEATHER_API_KEY = savedKey;
    }
  });

  it('the unique index rejects a second snapshot row for the same report', async () => {
    const reportId = new mongoose.Types.ObjectId();
    await WeatherSnapshot.create({ report: reportId, temperature: 38.5 });
    await expect(
      WeatherSnapshot.create({ report: reportId, temperature: 39.0 })
    ).rejects.toThrow(/duplicate key/i);
  });
});

describe('weather history (review fix: join through report)', () => {
  it('returns snapshots whose report is near the requested coordinates', async () => {
    const report = await Report.create({
      latitude: 24.86,
      longitude: 67.0,
      city: 'Karachi',
      status: 'verified',
    });
    await WeatherSnapshot.create({
      report: report._id,
      temperature: 38.5,
      heatIndex: 44.0,
      fetchedAt: new Date(),
    });

    const near = await getWeatherHistory(24.86, 67.0);
    expect(near).toHaveLength(1);
    expect(near[0].temperature).toBe(38.5);
    // The joined report document is projected out, not leaked.
    expect(near[0].reportDoc).toBeUndefined();
  });

  it('returns nothing for coordinates far from any snapshot', async () => {
    const report = await Report.create({ latitude: 24.86, longitude: 67.0 });
    await WeatherSnapshot.create({ report: report._id, temperature: 38.5 });

    const far = await getWeatherHistory(31.5, 74.3); // Lahore
    expect(far).toHaveLength(0);
  });

  it('honors from/to and limit', async () => {
    const report = await Report.create({ latitude: 24.86, longitude: 67.0 });
    const old = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    await WeatherSnapshot.create({ report: report._id, temperature: 37.0, fetchedAt: old });

    // from=now excludes the 10-day-old snapshot.
    const recent = await getWeatherHistory(24.86, 67.0, {
      from: new Date().toISOString(),
    });
    expect(recent).toHaveLength(0);

    const all = await getWeatherHistory(24.86, 67.0, { limit: 5 });
    expect(all.length).toBeLessThanOrEqual(5);
  });
});
