import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  authenticateUser,
  registerUser,
  logoutUser,
  fetchCurrentUser,
  onTokenRefresh,
  verifyEmail,
  resendOtp,
} from '../services/api';
import { authStorage } from '../services/localStorageService';
import useUserLocationStore from '../stores/userLocationStore';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from './authPermissions';

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
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, isLoading: true, error: null };
    case AUTH_ACTIONS.LOGIN_SUCCESS: {
      const userRole = (action.payload?.user?.role || 'USER').toUpperCase();
      return {
        ...state,
        user: action.payload?.user || null,
        token: action.payload?.token || action.payload?.accessToken || null,
        isAuthenticated: Boolean(action.payload?.user),
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
    case AUTH_ACTIONS.TOKEN_REFRESHED:
      return { ...state, token: action.payload };
    case AUTH_ACTIONS.CLEAR_ERROR:
      if (state.error === null) return state;
      return { ...state, error: null };
    default:
      return state;
  }
};

const AuthContext = (globalThis.__THERMAX_AUTH_CONTEXT__ ??= createContext(null));

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Restore session on mount: a token in storage is only a *claim*.
  // Validate it against GET /api/auth/me before treating the user as
  // authenticated — a stale or revoked token must not resurrect a session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = authStorage.getToken();
      if (!token) {
        dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
        return;
      }
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        if (user) {
          authStorage.setCurrentUser(user);
          const currentToken = authStorage.getToken() || token;
          dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user, token: currentToken } });
        } else {
          authStorage.clearAuth();
          dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
        }
      } catch {
        if (cancelled) return;
        authStorage.clearAuth();
        dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the cached token in sync with silent refreshes: the axios
  // interceptor writes the fresh token to storage AND notifies here, so
  // the persist effect below never writes a stale token back over it.
  useEffect(() => {
    const unsubscribe = onTokenRefresh((newAccessToken) => {
      dispatch({ type: AUTH_ACTIONS.TOKEN_REFRESHED, payload: newAccessToken });
    });
    return unsubscribe;
  }, []);

  // Persist session & prompt for location on login
  useEffect(() => {
    if (state.isAuthenticated && state.token && state.user) {
      authStorage.setToken(state.token);
      authStorage.setCurrentUser(state.user);
      // Immediately prompt for location after login
      useUserLocationStore.getState().requestLocation({ force: true });
    } else if (!state.isAuthenticated && !state.isLoading) {
      authStorage.clearAuth();
    }
  }, [state.isAuthenticated, state.isLoading, state.token, state.user]);

  const login = useCallback(async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const data = await authenticateUser(credentials);
      if (!data?.user) {
        throw new Error(data?.message || 'Login failed: Invalid server response');
      }
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: data.user, token: data.token || data.accessToken },
      });
      return { success: true, user: data.user };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Login failed';
      const code = error?.response?.data?.code;
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      return {
        success: false,
        error: errorMessage,
        code,
      };
    }
  }, []);

  const signup = useCallback(async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const data = await registerUser(userData);
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      return {
        success: true,
        user: data.user,
        message: data.message,
        isEmailVerified: Boolean(data.user?.isEmailVerified),
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Signup failed';
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const verifyEmailOtp = useCallback(async (email, code) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const data = await verifyEmail(email, code);
      if (!data?.user) {
        throw new Error(data?.message || 'Verification failed');
      }
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: data.user, token: data.token || data.accessToken },
      });
      return { success: true, user: data.user, message: data.message };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Verification failed';
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const resendVerificationOtp = useCallback(async (email) => {
    try {
      const data = await resendOtp(email, 'verification');
      return { success: true, message: data?.message || 'OTP resent successfully.' };
    } catch (error) {
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Failed to resend OTP',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Server-side revocation best effort
    } finally {
      authStorage.clearAuth();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      navigate('/login');
    }
  }, [navigate]);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const hasPermission = useCallback((permission) => state.permissions.includes(permission), [state.permissions]);
  const hasRole = useCallback((role) => state.role === role, [state.role]);
  const isAdmin = useCallback(() => state.role === ROLES.ADMIN, [state.role]);

  const requireAuth = useCallback((redirectTo = '/login') => {
    if (!state.isAuthenticated) { navigate(redirectTo); return false; }
    return true;
  }, [state.isAuthenticated, navigate]);

  const requireRole = useCallback((requiredRole, redirectTo = '/dashboard') => {
    if (!state.isAuthenticated) { navigate('/login'); return false; }
    if (requiredRole && !hasRole(requiredRole)) { navigate(redirectTo); return false; }
    return true;
  }, [state.isAuthenticated, hasRole, navigate]);

  const value = useMemo(() => ({
    ...state,
    login,
    signup,
    verifyEmailOtp,
    resendVerificationOtp,
    logout,
    clearError,
    hasPermission,
    hasRole,
    isAdmin,
    requireAuth,
    requireRole,
    ROLES,
    PERMISSIONS,
  }), [
    state,
    login,
    signup,
    verifyEmailOtp,
    resendVerificationOtp,
    logout,
    clearError,
    hasPermission,
    hasRole,
    isAdmin,
    requireAuth,
    requireRole,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// useAuth is a custom hook and withAuth is a higher-order component — both
// are fast-refresh-safe in practice. The react-refresh plugin flags them
// because it only statically recognizes components; splitting them into
// another file would churn every importer for no runtime benefit.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    if (typeof window !== 'undefined' && (import.meta.env?.DEV || process.env.NODE_ENV !== 'production')) {
      console.warn('useAuth was called outside of an active AuthProvider or during HMR reload');
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        permissions: [],
        role: null,
        error: null,
        login: async () => ({ success: false }),
        signup: async () => ({ success: false }),
        verifyEmailOtp: async () => ({ success: false }),
        resendVerificationOtp: async () => ({ success: false }),
        logout: async () => {},
        clearError: () => {},
        hasPermission: () => false,
        hasRole: () => false,
        isAdmin: () => false,
        requireAuth: () => false,
        requireRole: () => false,
        ROLES: { CITIZEN: 'USER', USER: 'USER', ADMIN: 'ADMIN', MODERATOR: 'MODERATOR' },
        PERMISSIONS: {},
      };
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const withAuth = (Component, requiredRole = null) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return null;
    if (requiredRole && user?.role !== requiredRole) return null;
    return <Component {...props} />;
  };
};

export default AuthContext;
