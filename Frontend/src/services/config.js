/**
 * ThermaX Production API Configuration
 */
export const DATA_MODE = 'api';
export const isLocalMode = () => false;
export const isApiMode = () => true;
export const setDataMode = () => {};

export const STORAGE_KEYS = {
  TOKEN: 'thermax_token',
  CURRENT_USER: 'thermax_user',
};

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  REPORTS: '/api/report',
  HEATMAP: '/api/heatmap',
  HOTSPOTS: '/api/hotspots',
  USERS: '/api/users',
  ADMIN_STATS: '/api/dashboard/snapshot',
  DASHBOARD_SNAPSHOT: '/api/dashboard/snapshot',
};
