import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'fallback_secret_key_thermax';
const JWT_EXPIRES_IN = () => process.env.JWT_ACCESS_EXPIRES_IN || '15m';

/**
 * Generate 15-minute Access Token
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET(),
    {
      expiresIn: JWT_EXPIRES_IN(),
      algorithm: 'HS256',
    }
  );
};

/**
 * Generate 7-day Cryptographic Refresh Token string
 */
export const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Hash raw token string using SHA-256 for database storage
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify JWT Access token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET());
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

// Backward-compatible exports
export const generateToken = generateAccessToken;
export const verifyToken = verifyAccessToken;

export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
