/**
 * ThermaX Auth Token Storage
 * Only persists JWT token and current user session for API mode.
 */
import { STORAGE_KEYS } from './config';

export const authStorage = {
  getCurrentUser: () => {
    try {
      const item = localStorage.getItem('thermax_user');
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  setCurrentUser: (user) => {
    try { localStorage.setItem('thermax_user', JSON.stringify(user)); } catch {}
  },
  getToken: () => {
    try { return localStorage.getItem(STORAGE_KEYS.TOKEN); } catch { return null; }
  },
  setToken: (token) => {
    try { localStorage.setItem(STORAGE_KEYS.TOKEN, token); } catch {}
  },
  clearAuth: () => {
    localStorage.removeItem('thermax_user');
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  },
};

// No-op stubs so existing imports in api.js don't break at build time
export const userStorage = {};
export const reportStorage = {};
export const hotspotStorage = {};
export const isSeeded = () => false;
export const setSeeded = () => {};
export const clearSeeded = () => {};
