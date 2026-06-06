// Centralized service exports for better modular architecture
export {
  // Authentication
  authenticateUser,
  login,
  signup,
  verifyEmail,
  // Data Fetching
  fetchHeatmap,
  fetchHotspots,
  fetchReports,
  fetchMyReports,
  fetchReportsCenter,
  fetchInsightSnapshot,
  // Report Management
  submitHeatReport,
  generateMitigationReport,
  // Utilities
  formatTimestamp,
  getAvailableAreas,
  detectAreaName,
} from './api.js';
export { default as heatmapService } from './heatmapService.js';
export { default as hotspotsService } from './hotspotsService.js';
export {
  fetchCurrentWeather,
  fetchWeatherHistory,
  getWeatherErrorMessage,
} from './weatherService.js';
