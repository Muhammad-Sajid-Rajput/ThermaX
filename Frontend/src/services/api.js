import axios from 'axios';
import { authStorage } from './localStorageService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for automatic 401 Access Token refresh.
// Parallel 401s share a single in-flight refresh (refreshPromise) so N
// simultaneous failures don't fire N refresh calls and race the token.
let refreshPromise = null;

// Token-refresh listeners: the axios layer owns the refresh, but React
// state (AuthContext) also caches the token. Without this bridge the
// context keeps the pre-refresh token and its persist effect would write
// the stale token back over the fresh one in storage.
const tokenRefreshListeners = new Set();
export function onTokenRefresh(listener) {
  tokenRefreshListeners.add(listener);
  return () => {
    tokenRefreshListeners.delete(listener);
  };
}
function notifyTokenRefresh(newAccessToken) {
  tokenRefreshListeners.forEach((listener) => {
    try {
      listener(newAccessToken);
    } catch {
      // A listener must never break the refresh for everyone else.
    }
  });
}

function doRefresh() {
  if (!refreshPromise) {
    const storedRefreshToken = authStorage.getRefreshToken();
    refreshPromise = axios
      .post(
        `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/refresh`,
        storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
        { withCredentials: true }
      )
      .then((refreshRes) => {
        const newAccessToken = refreshRes.data?.accessToken;
        const newRefreshToken = refreshRes.data?.refreshToken;
        if (!newAccessToken) {
          throw new Error('Refresh did not return an access token');
        }
        authStorage.setToken(newAccessToken);
        if (newRefreshToken) {
          authStorage.setRefreshToken(newRefreshToken);
        }
        notifyTokenRefresh(newAccessToken);
        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/api/auth/login') &&
      !originalRequest.url.includes('/api/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await doRefresh();
        originalRequest.headers = originalRequest.headers || {};
        if (typeof originalRequest.headers.set === 'function') {
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        } else {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        authStorage.clearAuth();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export const PLATFORM_UPDATED_AT = new Date().toISOString();

export const HOTSPOT_PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
export const HOTSPOT_PRIORITY_COLORS = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#eab308',
};

export function formatTimestamp(isoString) {
  if (!isoString) return 'Just now';
  try {
    return new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

// ─── AUTHENTICATION API ───────────────────────────────────────────────────────
export async function authenticateUser(payload) {
  const response = await api.post('/api/auth/login', payload);
  if (response.data?.token || response.data?.accessToken) {
    authStorage.setToken(response.data.accessToken || response.data.token);
  }
  if (response.data?.refreshToken) {
    authStorage.setRefreshToken(response.data.refreshToken);
  }
  return response.data;
}

export async function registerUser(payload) {
  const response = await api.post('/api/auth/signup', payload);
  return response.data;
}

export async function logoutUser() {
  const storedRefreshToken = authStorage.getRefreshToken();
  try {
    const response = await api.post(
      '/api/auth/logout',
      storedRefreshToken ? { refreshToken: storedRefreshToken } : {}
    );
    return response.data;
  } finally {
    authStorage.clearAuth();
  }
}

export async function verifyEmail(email, code) {
  const response = await api.post('/api/auth/verify-email', { email, code });
  if (response.data?.token || response.data?.accessToken) {
    authStorage.setToken(response.data.accessToken || response.data.token);
  }
  if (response.data?.refreshToken) {
    authStorage.setRefreshToken(response.data.refreshToken);
  }
  return response.data;
}

export async function forgotPassword(email) {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(email, code, newPassword) {
  const response = await api.post('/api/auth/reset-password', {
    email,
    code,
    newPassword,
  });
  return response.data;
}

export async function resendOtp(email, type = 'verification') {
  const response = await api.post('/api/auth/resend-otp', { email, type });
  return response.data;
}

// ─── REPORTS API ──────────────────────────────────────────────────────────────
export async function fetchReports(filters = {}) {
  const response = await api.get('/api/report', { params: filters });
  return {
    data: response.data?.reports || response.data || [],
    total: response.data?.total || 0,
    source: 'api',
  };
}

export async function fetchMyReports() {
  const response = await api.get('/api/reports/my-reports');
  return {
    user: response.data?.user || null,
    reports: response.data?.reports || [],
    source: 'api',
  };
}

/**
 * Build the multipart body for report submission.
 *
 * The backend route uses `upload.single('image')` and reads the report
 * fields from the `reportData` JSON field. A File placed inside a plain
 * JSON object would serialize to `{}` and silently drop the photo, so the
 * file must travel as its own multipart part.
 */
export function buildReportFormData(payload, imageFile) {
  const body = new FormData();
  body.append('reportData', JSON.stringify(payload));
  if (imageFile) {
    body.append('image', imageFile);
  }
  return body;
}

/**
 * Validate the stored access token against the backend.
 * Returns the current user on success, null when the session is dead
 * (callers should clear storage and send the user to /login).
 */
export async function fetchCurrentUser() {
  const response = await api.get('/api/auth/me');
  return response.data?.user ?? null;
}

/**
 * Safe, meaningful message for a failed report submission — mirrors the
 * getWeatherErrorMessage style in services/weatherService.js.
 *
 * Distinguishes: no response (network failure), 5xx (server error, status
 * code only), and 4xx (validation error with the server's message). Only
 * the status code and a server-provided message *string* ever reach the
 * UI — never stack traces or raw error objects.
 */
export function getSubmissionErrorMessage(err) {
  const status = err?.response?.status;
  const serverMessage =
    typeof err?.response?.data?.message === 'string'
      ? err.response.data.message
      : null;
  if (status != null) {
    if (status >= 500) {
      return `Server error (${status}). Please try again later.`;
    }
    if (status >= 400) {
      return (
        serverMessage ||
        `Submission rejected (${status}). Please check the form and try again.`
      );
    }
    return serverMessage || `Submission failed (${status}).`;
  }
  if (err?.request) {
    return 'Network error: the server did not respond. Check your connection and try again.';
  }
  return 'Submission failed. Please try again.';
}

export async function submitHeatReport(payload, { onUploadProgress } = {}) {
  let response;
  if (payload instanceof FormData) {
    // Never set Content-Type manually here: the browser must append the
    // multipart boundary itself. A boundary-less 'multipart/form-data'
    // header makes multer reject the upload ("Boundary not found") and the
    // photo is silently discarded.
    response = await api.post('/api/report', payload, {
      // Axios upload progress (bytes sent / total). Only fires for the
      // multipart path — JSON payloads are tiny and don't need it.
      ...(typeof onUploadProgress === 'function' ? { onUploadProgress } : {}),
    });
  } else {
    response = await api.post('/api/report', payload);
  }
  return response.data;
}

export async function deleteMyReport(reportId) {
  try {
    const response = await api.delete(`/api/report/${reportId}`);
    return response.data;
  } catch (error) {
    // Surface the backend's friendly message (e.g. pending-only delete rule)
    // instead of a raw "Request failed with status code 400".
    throw new Error(error.response?.data?.message || 'Delete failed');
  }
}

// ─── HEATMAP & HOTSPOTS API ───────────────────────────────────────────────────
export async function fetchHeatmap(filters = {}) {
  const response = await api.get('/api/heatmap', { params: filters });
  return {
    data: response.data?.heatmap || [],
    source: 'api',
    lastUpdated: response.data?.lastUpdated,
  };
}

export async function fetchHotspots(filters = {}) {
  const response = await api.get('/api/hotspots', { params: filters });
  return {
    data: response.data?.hotspots || [],
    source: 'api',
    lastUpdated: response.data?.lastUpdated,
  };
}

// ─── DASHBOARD & INSIGHTS API ─────────────────────────────────────────────────
export async function fetchDashboard(filters = {}) {
  const response = await api.get('/api/dashboard/snapshot', { params: filters });
  return response.data;
}
export const fetchDashboardSnapshot = fetchDashboard;

export async function fetchAdminStats() {
  const response = await api.get('/api/dashboard/snapshot');
  return response.data;
}

export async function fetchReportsCenter(filters = {}) {
  const [reportsRes, hotspotsRes, heatmapRes] = await Promise.all([
    fetchReports(filters),
    fetchHotspots(filters),
    fetchHeatmap(filters),
  ]);
  return {
    reports: reportsRes.data,
    hotspots: hotspotsRes.data,
    heatmap: heatmapRes.data,
    source: 'api',
  };
}

// ─── USER & MODERATION MANAGEMENT API (ADMIN) ─────────────────────────────────
export async function fetchUsers() {
  const response = await api.get('/api/users');
  return response.data?.users || [];
}

export async function updateUserRole(userId, role) {
  const response = await api.put(`/api/users/${userId}/role`, { role });
  return response.data;
}

export async function updateUserStatus(userId, isActive) {
  const response = await api.put(`/api/users/${userId}/status`, { isActive });
  return response.data;
}

export async function fetchModerationQueue() {
  const response = await api.get('/api/report/admin/all');
  return {
    queue: response.data?.reports || [],
    source: 'api',
  };
}

// Phase 3 report-lifecycle vocabulary: 'pending' | 'verified' | 'flagged' | 'rejected'.
const MODERATION_DECISIONS = ['verified', 'flagged', 'rejected'];
const MODERATION_DECISION_ALIASES = {
  validated: 'verified',
  anomaly: 'flagged',
  approve: 'verified',
};

// Pure helper: resolves an admin decision to the real lifecycle vocabulary.
// Throws on anything else so an invalid decision can never be silently mapped.
export function normalizeModerationDecision(decision) {
  const key = String(decision || '').toLowerCase();
  if (MODERATION_DECISIONS.includes(key)) return key;
  if (MODERATION_DECISION_ALIASES[key]) return MODERATION_DECISION_ALIASES[key];
  throw new Error(`Invalid moderation decision: ${decision}`);
}

export async function updateModerationStatus(reportId, decision) {
  const status = normalizeModerationDecision(decision);
  const response = await api.patch(`/api/report/${reportId}/moderate`, { status });
  return response.data;
}

export async function fetchAuditLogs(limit = 50) {
  const response = await api.get(`/api/users/audit-logs?limit=${limit}`);
  return response.data;
}

// ─── PHASE 4: ENRICHMENT DEAD LETTERS (ADMIN) ───────────────────────────────
// Reports whose ML enrichment trigger failed after all retries. Surfaced
// here instead of being swallowed.
export async function fetchEnrichmentFailures() {
  const response = await api.get('/api/admin/enrichment-failures');
  return response.data?.failures || [];
}

export async function retryEnrichmentFailure(failureId) {
  const response = await api.post(`/api/admin/enrichment-failures/${failureId}/retry`);
  return response.data;
}

export async function dismissEnrichmentFailure(failureId) {
  const response = await api.post(`/api/admin/enrichment-failures/${failureId}/dismiss`);
  return response.data;
}

// ─── OUTLIER REVIEW NOTIFICATIONS (ADMIN) ──────────────────────────────────
// Autonomous QC flags outliers (extreme citizen-vs-instrument temperature
// contradictions and enrichment failures) for manual human-in-the-loop review.
export async function fetchAdminNotifications() {
  const response = await api.get('/api/admin/notifications');
  return response.data?.notifications || [];
}

export async function markNotificationRead(id) {
  const response = await api.post(`/api/admin/notifications/${id}/read`);
  return response.data;
}

// ─── AREA INSIGHTS (ADMIN) ──────────────────────────────────────────────────
// One payload shape, three exits: the page renders it, the JSON button
// downloads it verbatim (client-side Blob), the CSV button hits the export
// endpoint. `area` is an optional literal substring; empty values are dropped
// so the server never sees `area=`.
function insightsParams({ city, province, area, days, includeSynthetic }) {
  const params = { days };
  if (province) params.province = province;
  if (city) params.city = city;
  if (area && area.trim()) params.area = area.trim();
  if (includeSynthetic !== undefined) {
    params.includeSynthetic = String(includeSynthetic);
  }
  return params;
}

export async function fetchInsights(options, { signal } = {}) {
  const response = await api.get('/api/insights', { params: insightsParams(options), signal });
  return response.data;
}

export async function downloadInsightsCsv(options) {
  const response = await api.get('/api/insights/export', {
    params: { ...insightsParams(options), format: 'csv' },
    responseType: 'blob',
  });
  return response.data;
}

// ─── EXPORTS API ──────────────────────────────────────────────────────────────
export async function fetchExportHistory() {
  const response = await api.get('/api/exports/history');
  return response.data;
}


// ─── WEATHER API ──────────────────────────────────────────────────────────────
export async function fetchCurrentWeather(lat, lng) {
  const response = await api.get('/api/weather/current', { params: { lat, lng } });
  return response.data;
}

export async function detectAreaName(latitude, longitude) {
  if (latitude == null || longitude == null) return '';
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&accept-language=en`,
      { headers: { 'User-Agent': 'ThermaX-App' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const neighborhood =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        addr.commercial ||
        addr.village ||
        addr.hamlet ||
        data.name;

      const city =
        addr.city ||
        addr.town ||
        addr.state_district ||
        addr.county ||
        addr.state;

      if (neighborhood && city) {
        if (!neighborhood.toLowerCase().includes(city.toLowerCase())) {
          return `${neighborhood}, ${city}`;
        }
        return neighborhood;
      }
      if (neighborhood) return neighborhood;
      if (city) return city;
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 2).map((s) => s.trim()).join(', ');
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }

  // No fabricated fallback: if reverse-geocoding fails we return null and the
  // caller shows "Unknown area" instead of inventing a city label.
  return null;
}

export async function searchNominatimLocations(query, { signal } = {}) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) return [];
  const clean = query.trim();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    clean
  )}&countrycodes=pk&format=json&addressdetails=1&limit=6&accept-language=en`;

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'ThermaX-App',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const items = await res.json();
    return (items || []).map((item) => {
      const addr = item.address || {};
      const primaryName =
        item.name ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.hamlet ||
        addr.county ||
        clean;

      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        primaryName;

      const province =
        addr.state ||
        addr.province ||
        addr.region ||
        '';

      const district = addr.county || addr.state_district || '';

      return {
        id: item.place_id,
        name: primaryName,
        displayName: item.display_name,
        city,
        province,
        district,
        lat: item.lat,
        lon: item.lon,
        type: item.type || item.class || 'location',
      };
    });
  } catch (err) {
    if (err?.name === 'AbortError') return [];
    console.warn('Nominatim forward search error:', err);
    return [];
  }
}

export async function checkHealth() {
  try {
    const response = await api.get('/api/health');
    return response.data?.status === 'OK';
  } catch {
    return false;
  }
}

export const getAvailableAreas = () => [];
export const getAreaProfiles = () => [];

export default api;
