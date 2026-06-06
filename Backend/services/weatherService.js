import Weather from '../models/Weather.js';

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

export function clearCacheEntry(cacheKey) {
  memoryCache.delete(cacheKey);
}

export async function fetchFromAPI(lat, lng) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new ConfigError('Weather API is not configured');
  }

  const q = `${lat},${lng}`;
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(q)}`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new WeatherApiError('Failed to reach weather provider');
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch {
    throw new WeatherApiError('Invalid response from weather provider');
  }

  if (parsed.error) {
    throw new WeatherApiError(
      parsed.error.message || 'Weather provider returned an error',
      response.status >= 400 && response.status < 600 ? response.status : 502
    );
  }

  if (!response.ok) {
    throw new WeatherApiError('Weather provider request failed', response.status);
  }

  return parsed;
}

export function normalize(parsed, lat, lng) {
  const current = parsed.current ?? {};
  const location = parsed.location ?? {};

  const heatIndex =
    current.heatindex_c ?? current.feelslike_c ?? current.temp_c ?? null;

  const cacheKey = buildCacheKey(lat, lng);

  return {
    location: location.name ?? 'Unknown',
    country: location.country ?? '',
    temperature: current.temp_c ?? null,
    humidity: current.humidity ?? null,
    feelsLike: current.feelslike_c ?? null,
    heatIndex,
    uv: current.uv ?? null,
    windKph: current.wind_kph ?? null,
    condition: current.condition?.text ?? 'Unknown',
    coordinates: {
      lat: location.lat ?? lat,
      lng: location.lon ?? lng,
    },
    observedAt: location.localtime ?? new Date().toISOString(),
    source: 'weatherapi',
    cached: false,
    saved: false,
    cacheKey,
  };
}

export function buildAlerts(heatIndex) {
  const extremeHeat =
    heatIndex != null && Number(heatIndex) >= HEAT_ALERT_C;

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

  if (!shouldSave(cacheKey)) {
    return false;
  }

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
        coordinates: [
          weatherDto.coordinates.lng,
          weatherDto.coordinates.lat,
        ],
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
    if (cached) {
      if (save) {
        const saved = await saveRecord(cached);
        return { ...cached, saved };
      }
      return cached;
    }
  }

  const parsed = await fetchFromAPI(validLat, validLng);
  const dto = normalize(parsed, validLat, validLng);
  dto.alerts = buildAlerts(dto.heatIndex);

  if (save) {
    dto.saved = await saveRecord(dto);
  }

  setCache(cacheKey, { ...dto, cached: false });
  return dto;
}

export async function getWeatherHistory(lat, lng, { from, to, limit = 50 } = {}) {
  const { lat: validLat, lng: validLng } = validateCoordinates(lat, lng);
  const cacheKey = buildCacheKey(validLat, validLng);
  const cap = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  const query = { cacheKey };

  if (from || to) {
    query.fetchedAt = {};
    if (from) query.fetchedAt.$gte = new Date(from);
    if (to) query.fetchedAt.$lte = new Date(to);
  }

  try {
    const records = await Weather.find(query)
      .sort({ fetchedAt: -1 })
      .limit(cap)
      .lean();

    return records;
  } catch (err) {
    console.error('Weather history query failed:', err.message);
    return [];
  }
}

export async function getWeatherAnalyticsSummary() {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stats = await Weather.aggregate([
      { $match: { fetchedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgTemperature: { $avg: '$temperature' },
          maxHeatIndex: { $max: '$heatIndex' },
          avgHeatIndex: { $avg: '$heatIndex' },
          avgHumidity: { $avg: '$humidity' },
          avgUv: { $avg: '$uv' },
          maxUv: { $max: '$uv' },
        },
      },
    ]);

    const byCacheKey = await Weather.aggregate([
      { $match: { fetchedAt: { $gte: since } } },
      {
        $group: {
          _id: '$cacheKey',
          locationName: { $last: '$locationName' },
          maxHeatIndex: { $max: '$heatIndex' },
          avgHeatIndex: { $avg: '$heatIndex' },
          samples: { $sum: 1 },
        },
      },
      { $sort: { maxHeatIndex: -1 } },
      { $limit: 10 },
    ]);

    const { _id, ...summary } = stats[0] ?? {
      count: 0,
      avgTemperature: null,
      maxHeatIndex: null,
      avgHeatIndex: null,
      avgHumidity: null,
      avgUv: null,
      maxUv: null,
    };

    return {
      period: '7d',
      since: since.toISOString(),
      ...summary,
      hottestZones: byCacheKey,
    };
  } catch (err) {
    console.error('Weather analytics failed:', err.message);
    return {
      period: '7d',
      count: 0,
      hottestZones: [],
      error: 'Database unavailable',
    };
  }
}
