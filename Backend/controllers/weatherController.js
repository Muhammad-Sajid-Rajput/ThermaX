import {
  getCurrentWeather,
  getWeatherHistory,
  getWeatherAnalyticsSummary,
  ValidationError,
  ConfigError,
  WeatherApiError,
} from '../services/weatherService.js';

const isDev = process.env.NODE_ENV === 'development';

function handleWeatherError(error, res) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.message,
    });
  }

  if (error instanceof ConfigError) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: error.message,
    });
  }

  if (error instanceof WeatherApiError) {
    return res.status(502).json({
      error: 'Failed to fetch weather data',
      message: isDev ? error.message : 'Weather provider error',
    });
  }

  console.error(error);
  return res.status(500).json({
    error: 'Failed to fetch weather data',
    message: isDev ? error.message : 'Internal server error',
  });
}

export const getCurrent = async (req, res) => {
  try {
    const { lat, lng, save } = req.validatedQuery;
    const data = await getCurrentWeather(lat, lng, { save: Boolean(save) });
    res.json(data);
  } catch (error) {
    handleWeatherError(error, res);
  }
};

export const getHistory = async (req, res) => {
  try {
    const { lat, lng, from, to, limit } = req.validatedQuery;
    const records = await getWeatherHistory(lat, lng, { from, to, limit });
    res.json({
      message: 'Weather history retrieved successfully',
      count: records.length,
      records,
    });
  } catch (error) {
    handleWeatherError(error, res);
  }
};

export const getAnalyticsSummary = async (req, res) => {
  try {
    const summary = await getWeatherAnalyticsSummary();
    res.json({
      message: 'Weather analytics summary',
      summary,
    });
  } catch (error) {
    handleWeatherError(error, res);
  }
};

export const refreshWeather = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const data = await getCurrentWeather(lat, lng, {
      save: true,
      bypassCache: true,
    });
    res.json({
      message: 'Weather refreshed and saved',
      data,
    });
  } catch (error) {
    handleWeatherError(error, res);
  }
};
