/**
 * LocalStorage Service
 * Handles all localStorage operations for local demo mode
 */
import { STORAGE_KEYS } from './config';
// Generic get/set helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  },
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },
};
// User-related operations
export const userStorage = {
  getAll: () => storage.get(STORAGE_KEYS.USERS, []),
  getById: (id) => {
    const users = userStorage.getAll();
    return users.find((u) => u._id === id || u.id === id);
  },
  getByEmail: (email) => {
    const users = userStorage.getAll();
    return users.find((u) => u.email === email);
  },
  save: (user) => {
    const users = userStorage.getAll();
    const existingIndex = users.findIndex((u) => u.email === user.email);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push({
        ...user,
        _id:
          user._id ||
          `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: user.createdAt || new Date().toISOString(),
        isActive: user.isActive !== false,
        reportsSubmitted: user.reportsSubmitted || 0,
        reputation: user.reputation || 0,
        lastActive: new Date().toISOString(),
      });
    }
    storage.set(STORAGE_KEYS.USERS, users);
    return user;
  },
  update: (id, updates) => {
    const users = userStorage.getAll();
    const index = users.findIndex((u) => u._id === id || u.id === id);
    if (index >= 0) {
      users[index] = { ...users[index], ...updates };
      storage.set(STORAGE_KEYS.USERS, users);
      return users[index];
    }
    return null;
  },
};
// Report-related operations
export const reportStorage = {
  getAll: () => storage.get(STORAGE_KEYS.HEAT_REPORTS, []),
  getById: (id) => {
    const reports = reportStorage.getAll();
    return reports.find((r) => r._id === id || r.id === id);
  },
  getByUserId: (userId) => {
    const reports = reportStorage.getAll();
    return reports.filter((r) => r.userId === userId || r.userEmail === userId);
  },
  getByUserEmail: (email) => {
    const reports = reportStorage.getAll();
    return reports.filter((r) => r.userEmail === email);
  },
  save: (report) => {
    const reports = reportStorage.getAll();
    const newReport = {
      ...report,
      _id:
        report._id ||
        `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: report.timestamp || new Date().toISOString(),
      status: report.status || 'pending',
    };
    reports.unshift(newReport);
    storage.set(STORAGE_KEYS.HEAT_REPORTS, reports);
    return newReport;
  },
  update: (id, updates) => {
    const reports = reportStorage.getAll();
    const index = reports.findIndex((r) => r._id === id || r.id === id);
    if (index >= 0) {
      reports[index] = { ...reports[index], ...updates };
      storage.set(STORAGE_KEYS.HEAT_REPORTS, reports);
      return reports[index];
    }
    return null;
  },
  delete: (id) => {
    const reports = reportStorage.getAll();
    const filtered = reports.filter((r) => r._id !== id && r.id !== id);
    storage.set(STORAGE_KEYS.HEAT_REPORTS, filtered);
  },
};
// Hotspot-related operations
export const hotspotStorage = {
  getAll: () => storage.get(STORAGE_KEYS.HOTSPOTS, []),
  getById: (id) => {
    const hotspots = hotspotStorage.getAll();
    return hotspots.find((h) => h.id === id || h.clusterId === id);
  },
  getByArea: (area) => {
    const hotspots = hotspotStorage.getAll();
    return hotspots.filter((h) => h.area === area);
  },
  save: (hotspot) => {
    const hotspots = hotspotStorage.getAll();
    const newHotspot = {
      ...hotspot,
      id:
        hotspot.id ||
        hotspot.clusterId ||
        `cl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      updatedAt: new Date().toISOString(),
    };
    const existingIndex = hotspots.findIndex((h) => h.id === newHotspot.id);
    if (existingIndex >= 0) {
      hotspots[existingIndex] = newHotspot;
    } else {
      hotspots.push(newHotspot);
    }
    storage.set(STORAGE_KEYS.HOTSPOTS, hotspots);
    return newHotspot;
  },
  saveAll: (hotspots) => {
    storage.set(STORAGE_KEYS.HOTSPOTS, hotspots);
  },
};
// Analytics-related operations
export const analyticsStorage = {
  get: () => storage.get(STORAGE_KEYS.ANALYTICS, {}),
  set: (data) => {
    storage.set(STORAGE_KEYS.ANALYTICS, data);
  },
  update: (updates) => {
    const current = analyticsStorage.get();
    analyticsStorage.set({ ...current, ...updates });
  },
};
// Auth-related operations
export const authStorage = {
  getCurrentUser: () => storage.get(STORAGE_KEYS.CURRENT_USER, null),
  setCurrentUser: (user) => {
    storage.set(STORAGE_KEYS.CURRENT_USER, user);
  },
  getToken: () => storage.get(STORAGE_KEYS.TOKEN, null),
  setToken: (token) => {
    storage.set(STORAGE_KEYS.TOKEN, token);
  },
  clearAuth: () => {
    storage.remove(STORAGE_KEYS.CURRENT_USER);
    storage.remove(STORAGE_KEYS.TOKEN);
  },
};
// Check if data has been seeded
export const isSeeded = () => storage.get(STORAGE_KEYS.SEEDED, false);
export const setSeeded = () => storage.set(STORAGE_KEYS.SEEDED, true);
export const clearSeeded = () => storage.remove(STORAGE_KEYS.SEEDED);
