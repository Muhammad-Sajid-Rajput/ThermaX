import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js';
import { User, ROLES } from '../models/User.js';

/**
 * Authentication Middleware
 * Verifies JWT access token from Authorization header or cookie
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization) || req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No access token provided. Please log in.',
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired access token. Please refresh your session.',
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User account no longer exists.',
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated.',
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during authentication.',
    });
  }
};

/**
 * Optional Authentication Middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization) || req.cookies?.accessToken;

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.isActive !== false) {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Admin Authorization Middleware
 */
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource.',
    });
  }

  const userRole = String(req.user.role).toLowerCase();
  if (userRole !== ROLES.ADMIN && userRole !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required to access this resource.',
    });
  }

  next();
};

/**
 * Role-based Authorization Middleware Factory
 */
export const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    const currentRole = String(req.user.role).toLowerCase();
    if (!normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

export default {
  authenticate,
  optionalAuth,
  authorizeAdmin,
  authorizeRoles,
};
