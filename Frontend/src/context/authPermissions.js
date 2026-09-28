/**
 * Auth role/permission constants — kept in their own module so
 * AuthContext.jsx only exports components/hooks (react-refresh rule).
 */

// Role definitions
export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
};

// Permission levels
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  SUBMIT_REPORTS: 'submit_reports',
  VIEW_REPORTS: 'view_reports',
  MANAGE_REPORTS: 'manage_reports',
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SYSTEM: 'manage_system',
  BROADCAST_ALERTS: 'broadcast_alerts',
};

export const ROLE_PERMISSIONS = {
  [ROLES.USER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.SUBMIT_REPORTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.SUBMIT_REPORTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_REPORTS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.BROADCAST_ALERTS,
  ],
};
