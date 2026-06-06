// Centralized hook exports for better modular architecture
// API Hooks
export { default as useApiResource } from './api/useApiResource';
// Data Hooks
export { default as useHeatmap } from './data/useHeatmap';
export { default as useHeatmapData } from './data/useHeatmapData';
export { default as useHotspots } from './data/useHotspots';
export { default as useReports } from './data/useReports';
export { default as useRealTimeData } from './data/useRealTimeData';
export { default as useWeather } from './data/useWeather';
export { default as useLocationWeather } from './data/useLocationWeather';
// UI Hooks
export { default as useFullscreen } from './ui/useFullscreen';
// State Management Hooks
export { default as useSelectedLocation } from './useSelectedLocation';
export { default as useUserLocationStore } from '../stores/userLocationStore';
