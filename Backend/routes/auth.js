import express from 'express';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  verifyAccessToken,
} from '../utils/jwt.js';
import { validate, schemas } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function createAndAttachRefreshToken(user, req, res) {
  const rawRefreshToken = generateRefreshTokenString();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    deviceInfo,
    expiresAt,
  });

  res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTIONS);
  return rawRefreshToken;
}

// User signup
router.post(
  '/signup',
  authLimiter,
  validate(schemas.signup),
  async (req, res) => {
    try {
      const { name, email, password, phone, organization } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          error: 'Registration failed',
          message: 'Email is already registered',
        });
      }

      const user = new User({
        name,
        email,
        password,
        phone,
        organization,
      });

      await user.save();

      const accessToken = generateAccessToken(user._id, user.role);
      await createAndAttachRefreshToken(user, req, res);

      user.lastLoginAt = new Date();
      await user.save();

      res.status(201).json({
        message: 'User registered successfully',
        token: accessToken,
        accessToken,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          organization: user.organization,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: error.message || 'Internal server error',
      });
    }
  }
);

// User login
router.post(
  '/login',
  authLimiter,
  validate(schemas.login),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmailWithPassword(email);

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
          error: 'Login failed',
          message: 'Invalid email or password',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          error: 'Login failed',
          message: 'Account is deactivated',
        });
      }

      const accessToken = generateAccessToken(user._id, user.role);
      await createAndAttachRefreshToken(user, req, res);

      user.lastLoginAt = new Date();
      await user.save();

      res.json({
        message: 'Login successful',
        token: accessToken,
        accessToken,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message || 'Internal server error',
      });
    }
  }
);

// Token Refresh (Token Rotation)
router.post('/refresh', async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'No refresh token provided',
      });
    }

    const tokenHash = hashToken(rawToken);

    const storedTokenDoc = await RefreshToken.findOne({
      tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).populate('user');

    if (!storedTokenDoc || !storedTokenDoc.user || !storedTokenDoc.user.isActive) {
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'Invalid or revoked refresh token',
      });
    }

    storedTokenDoc.revoked = true;
    await storedTokenDoc.save();

    const user = storedTokenDoc.user;
    const newAccessToken = generateAccessToken(user._id, user.role);
    await createAndAttachRefreshToken(user, req, res);

    res.json({
      message: 'Token rotated successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Refresh failed',
      message: 'Internal server error during token refresh',
    });
  }
});

// Logout
router.post('/logout', optionalAuth, async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await RefreshToken.updateOne({ tokenHash }, { revoked: true });
    }

    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', message: error.message });
  }
});

// Verify Access Token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Verification failed', message: 'No token provided' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Verification failed', message: 'User inactive or not found' });
    }

    res.json({
      message: 'Token is valid',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Verification failed', message: 'Invalid or expired token' });
  }
});

// Get Current User (/me)
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      organization: req.user.organization,
      createdAt: req.user.createdAt,
    },
  });
});

export { router as authRoutes };
export default router;
