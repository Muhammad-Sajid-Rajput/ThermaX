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

// Response interceptor for automatic 401 Access Token refresh
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
        const refreshRes = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshRes.data?.accessToken;
        if (newAccessToken) {
          authStorage.setToken(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
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
  Medium: '#eab308',
  Low: '#22c55e',
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
  return response.data;
}

export async function verifyEmail(email, code) {
  const response = await api.post('/api/auth/verify-email', { email, code });
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

export async function submitHeatReport(payload) {
  let response;
  if (payload instanceof FormData) {
    response = await api.post('/api/report', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } else {
    response = await api.post('/api/report', payload);
  }
  return response.data;
}

export async function deleteMyReport(reportId) {
  const response = await api.delete(`/api/report/${reportId}`);
  return response.data;
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

export async function updateModerationStatus(reportId, decision) {
  const status = decision === 'validated' || decision === 'approve' ? 'validated' : 'rejected';
  const response = await api.patch(`/api/report/${reportId}/moderate`, { status });
  return response.data;
}

export async function fetchAuditLogs(limit = 50) {
  const response = await api.get(`/api/users/audit-logs?limit=${limit}`);
  return response.data;
}

// ─── EXPORTS API ──────────────────────────────────────────────────────────────
export async function fetchExportHistory() {
  const response = await api.get('/api/exports/history');
  return response.data;
}

export async function generateExportBriefing(options = {}) {
  const response = await api.post('/api/exports/generate', options);
  return response.data;
}

export async function generateMitigationReport(payload) {
  const response = await api.post('/api/report/generate', payload);
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

  // Fallback defaults for major Pakistan urban areas if network fails
  if (lat >= 24.7 && lat <= 25.1 && lng >= 66.8 && lng <= 67.3) return 'Karachi Urban';
  if (lat >= 25.3 && lat <= 25.5 && lng >= 68.3 && lng <= 68.5) return 'Hyderabad Urban';
  if (lat >= 31.4 && lat <= 31.7 && lng >= 74.2 && lng <= 74.5) return 'Lahore Metro';
  if (lat >= 33.5 && lat <= 33.8 && lng >= 72.9 && lng <= 73.2) return 'Islamabad / Rawalpindi';
  if (lat >= 33.9 && lat <= 34.1 && lng >= 71.4 && lng <= 71.7) return 'Peshawar City';
  if (lat >= 30.1 && lat <= 30.3 && lng >= 66.9 && lng <= 67.1) return 'Quetta City';

  return 'Local Area';
}

export const getAvailableAreas = () => [];
export const getAreaProfiles = () => [];

export default api;
