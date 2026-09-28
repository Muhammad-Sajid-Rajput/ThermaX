/**
 * ThermaX Auth Token Storage
 * Only persists JWT token and current user session for API mode.
 */
const STORAGE_KEYS = {
  TOKEN: 'thermax_token',
  REFRESH_TOKEN: 'thermax_refresh_token',
  CURRENT_USER: 'thermax_user',
};

export const authStorage = {
  getCurrentUser: () => {
    try {
      const item = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  setCurrentUser: (user) => {
    try { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)); } catch { /* storage unavailable — session simply won't persist */ }
  },
  getToken: () => {
    try { return localStorage.getItem(STORAGE_KEYS.TOKEN); } catch { return null; }
  },
  setToken: (token) => {
    try { localStorage.setItem(STORAGE_KEYS.TOKEN, token); } catch { /* storage unavailable — session simply won't persist */ }
  },
  getRefreshToken: () => {
    try { return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN); } catch { return null; }
  },
  setRefreshToken: (token) => {
    try { localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token); } catch { /* storage unavailable — session simply won't persist */ }
  },
  clearAuth: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch { /* storage unavailable */ }
  },
};

// No-op stubs so existing imports in api.js don't break at build time
export const userStorage = {};
export const reportStorage = {};
export const hotspotStorage = {};
export const isSeeded = () => false;
export const setSeeded = () => {};
export const clearSeeded = () => {};
