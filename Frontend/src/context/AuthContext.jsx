import { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authenticateUser } from '../services/api';
import { isLocalMode } from '../services/config';
import {
  userStorage,
  authStorage,
  isSeeded,
} from '../services/localStorageService';
import { seedDemoData } from '../services/seedData';
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
// Role permissions mapping
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
// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  permissions: [],
  role: null,
};
// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};
// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      const userRole = action.payload.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        permissions: userPermissions,
        role: userRole,
        error: null,
      };
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
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        permissions: [],
        role: null,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};
// Create context
const AuthContext = createContext();
// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();
  const location = useLocation();
  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('thermax_token');
    const userData = localStorage.getItem('thermax_user');
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        const userPermissions = ROLE_PERMISSIONS[user.role] || [];
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user,
            token,
          },
        });
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('thermax_token');
        localStorage.removeItem('thermax_user');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
    }
  }, []);
  // Save to localStorage when auth state changes
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      localStorage.setItem('thermax_token', state.token);
      localStorage.setItem('thermax_user', JSON.stringify(state.user));
    } else if (!state.isAuthenticated) {
      localStorage.removeItem('thermax_token');
      localStorage.removeItem('thermax_user');
    }
  }, [state.isAuthenticated, state.token, state.user]);
  // Login function
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      // Seed data if in local mode
      if (isLocalMode() && !isSeeded()) {
        seedDemoData();
      }
      // Use authenticateUser which handles both local and API modes
      const data = await authenticateUser(credentials);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: data.user,
          token: data.token,
        },
      });
      return { success: true, user: data.user };
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
  // Signup function
  const signup = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      let data;
      if (isLocalMode()) {
        // Local mode: create user in localStorage
        if (!isSeeded()) {
          seedDemoData();
        }
        const newUser = {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: 'USER',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          reportsSubmitted: 0,
          reputation: 0,
          verified: false,
        };
        const saved = userStorage.save(newUser);
        // Auto-login after signup
        const token = `thermax_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        authStorage.setCurrentUser(saved);
        authStorage.setToken(token);
        data = {
          user: {
            _id: saved._id,
            name: saved.name,
            email: saved.email,
            role: saved.role,
          },
          token,
          source: 'local',
        };
      } else {
        // API mode
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/signup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          }
        );
        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Signup failed');
        }
      }
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: data.user,
          token: data.token,
        },
      });
      return { success: true, user: data.user };
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
  // Logout function
  const logout = () => {
    if (isLocalMode()) {
      authStorage.clearAuth();
    }
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    navigate('/login');
  };
  // Permission check function
  const hasPermission = (permission) => {
    return state.permissions.includes(permission);
  };
  // Role check function
  const hasRole = (role) => {
    return state.role === role;
  };
  // Admin check function
  const isAdmin = () => {
    return state.role === ROLES.ADMIN;
  };
  // Protected route redirect
  const requireAuth = (redirectTo = '/auth') => {
    if (!state.isAuthenticated) {
      navigate(redirectTo);
      return false;
    }
    return true;
  };
  // Role-based redirect
  const requireRole = (requiredRole, redirectTo = '/dashboard') => {
    if (!state.isAuthenticated) {
      navigate('/auth');
      return false;
    }
    if (requiredRole && !hasRole(requiredRole)) {
      navigate(redirectTo);
      return false;
    }
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
// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
// Higher-order component for route protection
export const withAuth = (Component, requiredRole = null) => {
  return function AuthenticatedComponent(props) {
    const { requireRole, isAuthenticated, user } = useAuth();
    useEffect(() => {
      if (!isAuthenticated) {
        // Redirect to auth if not authenticated
        return;
      }
      if (requiredRole && user?.role !== requiredRole) {
        // Redirect to appropriate dashboard
        return;
      }
    }, [isAuthenticated, user, requiredRole]);
    if (!isAuthenticated) {
      return null; // or loading spinner
    }
    if (requiredRole && user?.role !== requiredRole) {
      return null; // or access denied component
    }
    return <Component {...props} />;
  };
};
export default AuthContext;
