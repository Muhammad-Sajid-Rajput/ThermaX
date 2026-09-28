import Weather from '../models/Weather.js';
import WeatherSnapshot from '../models/WeatherSnapshot.js';

const CACHE_TTL_MS = parseInt(process.env.WEATHER_CACHE_TTL_MS, 10) || 900000;
const SAVE_COOLDOWN_MS =
  parseInt(process.env.WEATHER_SAVE_COOLDOWN_MS, 10) || 900000;
const HEAT_ALERT_C = parseFloat(process.env.WEATHER_HEAT_ALERT_C) || 45;

const memoryCache = new Map();
const lastSaveByKey = new Map();

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
    this.statusCode = 503;
  }
}

export class WeatherApiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'WeatherApiError';
    this.statusCode = statusCode;
  }
}

export function buildCacheKey(lat, lng) {
  return `${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}`;
}

export function calculateHeatIndex(tempC, humidity) {
  if (tempC == null || tempC < 20 || !humidity) return tempC;
  const tempF = (tempC * 9) / 5 + 32;
  const hiF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    0.00683783 * tempF * tempF -
    0.05481717 * humidity * humidity +
    0.00122874 * tempF * tempF * humidity +
    0.00085282 * tempF * humidity * humidity -
    0.00000199 * tempF * tempF * humidity * humidity;
  return Number((((hiF - 32) * 5) / 9).toFixed(1));
}

export function validateCoordinates(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    throw new ValidationError('Latitude and longitude (lon) are required');
  }

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    throw new ValidationError('Latitude and longitude must be valid numbers');
  }

  if (latNum < -90 || latNum > 90) {
    throw new ValidationError('Latitude must be between -90 and 90');
  }

  if (lngNum < -180 || lngNum > 180) {
    throw new ValidationError('Longitude must be between -180 and 180');
  }

  return { lat: latNum, lng: lngNum };
}

export function getFromCache(cacheKey) {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return { ...entry.data, cached: true };
}

export function setCache(cacheKey, data) {
  memoryCache.set(cacheKey, { data, storedAt: Date.now() });
}

export function fetchFromAPI(lat, lng) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new ConfigError('Weather API is not configured');
  }

  const q = `${lat},${lng}`;
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(q)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  return fetch(url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new WeatherApiError('Weather provider request failed', res.status);
      return res.json();
    })
    .catch((err) => {
      if (err instanceof WeatherApiError) throw err;
      if (err.name === 'AbortError') {
        const timeoutErr = new WeatherApiError('Weather provider request timed out', 504);
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      throw new WeatherApiError('Failed to reach weather provider');
    })
    .finally(() => {
      clearTimeout(timer);
    });
}

export function normalize(parsed, lat, lng) {
  const current = parsed.current ?? {};
  const location = parsed.location ?? {};

  // Core measurements are required. A provider payload without them is
  // incomplete — we throw instead of inventing plausible-looking values.
  const tempC = current.temp_c;
  const humidity = current.humidity;
  if (tempC == null || humidity == null) {
    throw new WeatherApiError('Weather provider returned incomplete data');
  }

  const heatIndex =
    current.heatindex_c ?? current.feelslike_c ?? calculateHeatIndex(tempC, humidity);

  const cacheKey = buildCacheKey(lat, lng);

  const observedAt = location.localtime_epoch
    ? new Date(location.localtime_epoch * 1000).toISOString()
    : (location.localtime ? new Date(location.localtime).toISOString() : new Date().toISOString());

  return {
    location: location.name ?? null,
    country: location.country ?? null,
    temperature: tempC,
    humidity,
    feelsLike: current.feelslike_c ?? tempC,
    heatIndex,
    uv: current.uv ?? null,
    windKph: current.wind_kph ?? null,
    condition: current.condition?.text ?? null,
    coordinates: {
      lat: location.lat ?? lat,
      lng: location.lon ?? lng,
    },
    observedAt,
    source: 'weatherapi',
    isSynthetic: false,
    status: 'ok',
    cached: false,
    saved: false,
    cacheKey,
  };
}

export function buildAlerts(heatIndex) {
  const extremeHeat = heatIndex != null && Number(heatIndex) >= HEAT_ALERT_C;
  return {
    extremeHeat,
    message: extremeHeat
      ? 'Extreme heat detected — avoid prolonged outdoor activity'
      : null,
  };
}

function shouldSave(cacheKey) {
  const last = lastSaveByKey.get(cacheKey);
  if (!last) return true;
  return Date.now() - last > SAVE_COOLDOWN_MS;
}

export async function saveRecord(weatherDto) {
  const cacheKey = weatherDto.cacheKey;
  if (!shouldSave(cacheKey)) return false;

  try {
    await Weather.create({
      coordinates: weatherDto.coordinates,
      cacheKey,
      locationName: weatherDto.location,
      country: weatherDto.country,
      temperature: weatherDto.temperature,
      humidity: weatherDto.humidity,
      feelsLike: weatherDto.feelsLike,
      heatIndex: weatherDto.heatIndex,
      uv: weatherDto.uv,
      windKph: weatherDto.windKph,
      condition: weatherDto.condition,
      source: weatherDto.source,
      observedAt: weatherDto.observedAt
        ? new Date(weatherDto.observedAt)
        : new Date(),
      geoPoint: {
        type: 'Point',
        coordinates: [weatherDto.coordinates.lng, weatherDto.coordinates.lat],
      },
    });
    lastSaveByKey.set(cacheKey, Date.now());
    return true;
  } catch (err) {
    console.error('Weather save failed:', err.message);
    return false;
  }
}

export async function getCurrentWeather(lat, lng, options = {}) {
  const { lat: validLat, lng: validLng } = validateCoordinates(lat, lng);
  const { save = false, bypassCache = false } = options;
  const cacheKey = buildCacheKey(validLat, validLng);

  if (!bypassCache) {
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
  }

  // Any failure (unconfigured key, provider error, incomplete payload)
  // throws: this service never invents weather data. Callers and the API
  // surface it as "unavailable" instead.
  const parsed = await fetchFromAPI(validLat, validLng);
  const dto = normalize(parsed, validLat, validLng);
  dto.alerts = buildAlerts(dto.heatIndex);
  if (save) dto.saved = await saveRecord(dto);
  setCache(cacheKey, { ...dto, cached: false });
  return dto;
}

export async function enrichAndSaveSnapshot(reportId, lat, lng) {
  try {
    const weatherDto = await getCurrentWeather(lat, lng);
    const heatIndex =
      weatherDto.heatIndex ?? calculateHeatIndex(weatherDto.temperature, weatherDto.humidity);

    // Upsert keyed by report (unique index): the submit path runs weather
    // enrichment before the ML trigger fires, and reruns must never
    // create a second snapshot row for the same report.
    let snapshot;
    try {
      snapshot = await WeatherSnapshot.findOneAndUpdate(
        { report: reportId },
        {
          $set: {
            windSpeed: weatherDto.windKph != null ? Number((weatherDto.windKph / 3.6).toFixed(1)) : null,
            heatIndex,
            // Air temperature is stored (not just heat index) so QC can compare
            // the citizen-measured temperature against the provider reading.
            temperature: weatherDto.temperature ?? null,
            uvIndex: weatherDto.uv ?? null,
            weatherCondition: weatherDto.condition ?? null,
            source: weatherDto.source || 'weatherapi',
            isSynthetic: false,
            fetchedAt: new Date(),
            // Provider observation time (not our fetch time) — preserved
            // for QC provenance. Falls back to fetch time only when the
            // provider supplies none.
            observedAt: weatherDto.observedAt
              ? new Date(weatherDto.observedAt)
              : new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (upsertErr) {
      // Lost the insert race with a parallel enrichment (both upserts found
      // no row and tried to insert): the unique index kept exactly one row,
      // so return the winner's snapshot instead of reporting a failure.
      if (upsertErr?.code === 11000) {
        return WeatherSnapshot.findOne({ report: reportId });
      }
      throw upsertErr;
    }

    return snapshot;
  } catch (err) {
    // Weather unavailable (no API key, provider down, DB error): persist
    // nothing. The report simply has no weather snapshot — no fabricated
    // air-quality, wind, or temperature values are ever stored.
    console.error('Snapshot enrichment unavailable:', err.message);
    return null;
  }
}

export async function getWeatherHistory(lat, lng, options = {}) {
  const WeatherSnapshot = (await import('../models/WeatherSnapshot.js').catch(() => null))?.default;
  if (!WeatherSnapshot) return [];
  // Snapshots carry no coordinates of their own — each belongs to a report.
  // Join through the report and filter to a ~5km box around (lat, lng).
  // (A previous version queried { lat, lng } directly on the snapshot and
  // always returned [] — the fields don't exist on this model.)
  const DEG_PER_KM = 1 / 111;
  const radiusDeg = 5 * DEG_PER_KM;
  const { limit = 24, from, to } = options;
  const match = {
    'reportDoc.latitude': { $gte: lat - radiusDeg, $lte: lat + radiusDeg },
    'reportDoc.longitude': { $gte: lng - radiusDeg, $lte: lng + radiusDeg },
  };
  if (from || to) {
    match.fetchedAt = {};
    if (from) match.fetchedAt.$gte = new Date(from);
    if (to) match.fetchedAt.$lte = new Date(to);
  }
  const docs = await WeatherSnapshot.aggregate([
    {
      $lookup: {
        from: 'reports',
        localField: 'report',
        foreignField: '_id',
        as: 'reportDoc',
      },
    },
    { $unwind: '$reportDoc' },
    { $match: match },
    { $sort: { fetchedAt: -1 } },
    { $limit: Math.min(Math.max(Number(limit) || 24, 1), 200) },
    { $project: { reportDoc: 0 } },
  ]);
  return docs;
}

export async function getWeatherAnalyticsSummary(options = {}) {
  const WeatherSnapshot = (await import('../models/WeatherSnapshot.js').catch(() => null))?.default;
  if (!WeatherSnapshot) return { count: 0, avgTemp: null, avgHeatIndex: null };
  const [result] = await WeatherSnapshot.aggregate([
    { $group: { _id: null, count: { $sum: 1 }, avgTemp: { $avg: '$temperature' }, avgHeatIndex: { $avg: '$heatIndex' } } },
  ]);
  return result || { count: 0, avgTemp: null, avgHeatIndex: null };
}

export default {
  getCurrentWeather,
  getWeatherHistory,
  getWeatherAnalyticsSummary,
  enrichAndSaveSnapshot,
  calculateHeatIndex,
};

