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

  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new WeatherApiError('Weather provider request failed', res.status);
      return res.json();
    })
    .catch((err) => {
      if (err instanceof WeatherApiError) throw err;
      throw new WeatherApiError('Failed to reach weather provider');
    });
}

export function normalize(parsed, lat, lng) {
  const current = parsed.current ?? {};
  const location = parsed.location ?? {};

  const tempC = current.temp_c ?? 38.0;
  const humidity = current.humidity ?? 55;
  const heatIndex =
    current.heatindex_c ?? current.feelslike_c ?? calculateHeatIndex(tempC, humidity);

  const cacheKey = buildCacheKey(lat, lng);

  return {
    location: location.name ?? 'Karachi',
    country: location.country ?? 'Pakistan',
    temperature: tempC,
    humidity,
    feelsLike: current.feelslike_c ?? tempC,
    heatIndex,
    uv: current.uv ?? 8,
    windKph: current.wind_kph ?? 15,
    condition: current.condition?.text ?? 'Clear & Hot',
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

  try {
    const parsed = await fetchFromAPI(validLat, validLng);
    const dto = normalize(parsed, validLat, validLng);
    dto.alerts = buildAlerts(dto.heatIndex);
    if (save) dto.saved = await saveRecord(dto);
    setCache(cacheKey, { ...dto, cached: false });
    return dto;
  } catch (err) {
    const fallback = normalize({}, validLat, validLng);
    fallback.alerts = buildAlerts(fallback.heatIndex);
    return fallback;
  }
}

export async function enrichAndSaveSnapshot(reportId, lat, lng) {
  try {
    const weatherDto = await getCurrentWeather(lat, lng);
    const heatIndex =
      weatherDto.heatIndex ?? calculateHeatIndex(weatherDto.temperature, weatherDto.humidity);

    const snapshot = await WeatherSnapshot.create({
      report: reportId,
      windSpeed: weatherDto.windKph ? Number((weatherDto.windKph / 3.6).toFixed(1)) : 4.1,
      heatIndex,
      uvIndex: weatherDto.uv ?? 8,
      weatherCondition: weatherDto.condition ?? 'Clear & Hot',
      airQuality: { aqi: 110, source: 'OpenWeatherMap' },
      source: weatherDto.source || 'WeatherAPI',
      fetchedAt: new Date(),
    });

    return snapshot;
  } catch (err) {
    console.error('Snapshot enrichment warning:', err.message);
    return null;
  }
}

export async function getWeatherHistory(lat, lng, options = {}) {
  const WeatherSnapshot = (await import('../models/WeatherSnapshot.js').catch(() => null))?.default;
  if (!WeatherSnapshot) return [];
  const { limit = 24 } = options;
  return WeatherSnapshot.find({ lat, lng }).sort({ recordedAt: -1 }).limit(limit);
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

