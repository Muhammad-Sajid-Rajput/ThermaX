import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 10000,
});

/**
 * @param {number} lat
 * @param {number} lon - longitude (sent as `lon` query param per API contract)
 */
export async function fetchCurrentWeather(lat, lon, { save = false } = {}) {
  const { data } = await client.get('/api/weather/current', {
    params: {
      lat,
      lon,
      ...(save ? { save: true } : {}),
    },
  });
  return data;
}

export async function fetchWeatherHistory(lat, lon, params = {}) {
  const { data } = await client.get('/api/weather/history', {
    params: { lat, lon, ...params },
  });
  return data;
}

export function getWeatherErrorMessage(error) {
  if (!error) return 'Failed to load weather';
  if (error.response?.status === 400) {
    return (
      error.response.data?.message ||
      error.response.data?.messages?.join(', ') ||
      'Invalid coordinates'
    );
  }
  if (error.response?.status === 503) {
    return 'Weather service is not configured on the server';
  }
  if (error.response?.status === 502) {
    return 'Weather provider is temporarily unavailable';
  }
  if (error.code === 'ECONNABORTED') {
    return 'Weather request timed out';
  }
  if (!error.response) {
    return 'Cannot reach the ThermaX API. Is the backend running?';
  }
  return error.response.data?.message || 'Failed to load weather';
}
