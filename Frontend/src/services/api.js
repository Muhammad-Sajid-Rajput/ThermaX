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

export async function fetchInsightSnapshot(filters = {}) {
  const response = await api.get('/api/dashboard/insight', { params: filters });
  return {
    ...response.data,
    source: 'api',
  };
}

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
  return `Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
}

export const getAvailableAreas = () => [];
export const getAreaProfiles = () => [];

export default api;
