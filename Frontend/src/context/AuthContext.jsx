import { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticateUser } from '../services/api';
import { authStorage } from '../services/localStorageService';
import useUserLocationStore from '../stores/userLocationStore';

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

const ROLE_PERMISSIONS = {
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

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  permissions: [],
  role: null,
  error: null,
};

const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, isLoading: true, error: null };
    case AUTH_ACTIONS.LOGIN_SUCCESS: {
      const userRole = (action.payload.user.role || 'USER').toUpperCase();
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token || action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
        permissions: ROLE_PERMISSIONS[userRole] || [],
        role: userRole,
        error: null,
      };
    }
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        isAuthenticated: false,
        user: null,
        token: null,
        permissions: [],
        role: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return { ...initialState, isLoading: false };
    case AUTH_ACTIONS.UPDATE_USER:
      return { ...state, user: action.payload };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = authStorage.getToken();
    const user = authStorage.getCurrentUser();
    if (token && user) {
      try {
        dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user, token } });
      } catch {
        authStorage.clearAuth();
        dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
    }
  }, []);

  // Persist session & prompt for location on login
  useEffect(() => {
    if (state.isAuthenticated && state.token && state.user) {
      authStorage.setToken(state.token);
      authStorage.setCurrentUser(state.user);
      // Immediately prompt for location after login
      useUserLocationStore.getState().requestLocation({ force: true });
    } else if (!state.isAuthenticated) {
      authStorage.clearAuth();
    }
  }, [state.isAuthenticated, state.token, state.user]);

  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const data = await authenticateUser(credentials);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: data.user, token: data.token || data.accessToken },
      });
      return { success: true, user: data.user };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const signup = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Signup failed');
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: data.user, token: data.token || data.accessToken },
      });
      return { success: true, user: data.user };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    authStorage.clearAuth();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    navigate('/login');
  };

  const hasPermission = (permission) => state.permissions.includes(permission);
  const hasRole = (role) => state.role === role;
  const isAdmin = () => state.role === ROLES.ADMIN;

  const requireAuth = (redirectTo = '/auth') => {
    if (!state.isAuthenticated) { navigate(redirectTo); return false; }
    return true;
  };

  const requireRole = (requiredRole, redirectTo = '/dashboard') => {
    if (!state.isAuthenticated) { navigate('/auth'); return false; }
    if (requiredRole && !hasRole(requiredRole)) { navigate(redirectTo); return false; }
    return true;
  };

  const value = {
    ...state,
    login,
    signup,
    logout,
    hasPermission,
    hasRole,
    isAdmin,
    requireAuth,
    requireRole,
    ROLES,
    PERMISSIONS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const withAuth = (Component, requiredRole = null) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return null;
    if (requiredRole && user?.role !== requiredRole) return null;
    return <Component {...props} />;
  };
};

export default AuthContext;
