import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { ROLES } from '../models/User.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to req.user
 * Returns 401 if no token or invalid token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided. Please log in.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token. Please log in again.',
      });
    }

    // Find user in database
    let user;
    try {
      user = await User.findById(decoded.userId);
    } catch (dbError) {
      // If DB is unavailable, check if it's a mock user
      if (
        decoded.userId &&
        (decoded.userId.startsWith('admin') ||
          decoded.userId.startsWith('user'))
      ) {
        // Mock user fallback - attach minimal user data
        user = {
          _id: decoded.userId,
          role: decoded.role || ROLES.USER,
          name: 'Mock User',
          email: 'mock@thermax.com',
          isActive: true,
        };
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found or account no longer exists.',
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Attach user to request
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
 * Attaches user to req.user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyToken(token);
      let user = await User.findById(decoded.userId);

      // If DB unavailable, check for mock user
      if (
        !user &&
        decoded.userId &&
        (decoded.userId.startsWith('admin') ||
          decoded.userId.startsWith('user'))
      ) {
        user = {
          _id: decoded.userId,
          role: decoded.role || ROLES.USER,
          name: 'Mock User',
          email: 'mock@thermax.com',
          isActive: true,
        };
      }

      if (user && user.isActive !== false) {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      // Invalid token, continue without user (public access)
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

/**
 * Admin Authorization Middleware
 * Must be used AFTER authenticate middleware
 * Returns 403 if user is not an ADMIN
 */
export const authorizeAdmin = (req, res, next) => {
  // Check if authenticate middleware was run first
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource.',
    });
  }

  // Check if user has ADMIN role
  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required to access this resource.',
    });
  }

  next();
};

/**
 * Role-based Authorization Middleware Factory
 * Creates middleware that checks if user has one of the allowed roles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
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
