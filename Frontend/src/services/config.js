/**
 * ThermaX Configuration
 * * DATA_MODE determines how the application fetches and stores data:
 * -"local": Uses localStorage for all data (frontend-only demo mode)
 * -"api": Uses the backend API (requires running server)
 * * To switch modes, change the value below or set in browser console:
 * localStorage.setItem('thermax_mode','api')
 */
const STORAGE_KEY = 'thermax_mode';
// Check if there's a mode set in localStorage, otherwise default to'local'
const getStoredMode = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'local' || stored === 'api') {
      return stored;
    }
  }
  return import.meta.env.VITE_API_BASE_URL ? 'api' : 'api';
};
export const DATA_MODE = 'api';
export const isLocalMode = () => false;
export const isApiMode = () => true;
// Helper to set mode at runtime
export const setDataMode = (mode) => {
  if (mode === 'local' || mode === 'api') {
    localStorage.setItem(STORAGE_KEY, mode);
    window.location.reload();
  }
};
// LocalStorage keys
export const STORAGE_KEYS = {
  USERS: 'thermax_users',
  CURRENT_USER: 'thermax_current_user',
  TOKEN: 'thermax_token',
  HEAT_REPORTS: 'thermax_heat_reports',
  HOTSPOTS: 'thermax_hotspots',
  ANALYTICS: 'thermax_analytics',
  SEEDED: 'thermax_seeded',
};
// API endpoints (for reference when in API mode)
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
// Demo credentials (for local mode)
export const DEMO_CREDENTIALS = {
  ADMIN: {
    email: 'admin@thermax.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'ADMIN',
  },
  USER: {
    email: 'demo@thermax.com',
    password: 'demo123',
    name: 'Demo User',
    role: 'USER',
  },
};
