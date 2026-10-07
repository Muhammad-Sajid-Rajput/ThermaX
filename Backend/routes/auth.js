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
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * ─── Session policy (single source of truth) ────────────────────────────────
 * - No usable session is issued until the email address is verified.
 * - POST /signup creates the account and sends an OTP; it returns NO tokens.
 * - POST /login rejects unverified accounts with 403 EMAIL_NOT_VERIFIED.
 * - POST /verify-email is the only place (besides /refresh) that mints tokens.
 * - Re-registering an unverified email only resends the OTP: credentials are
 *   never overwritten and no tokens are issued (account-takeover fix).
 * ────────────────────────────────────────────────────────────────────────────
 */

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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

// User signup (NovaMind auth pattern with Resend OTP email verification)
router.post(
  '/signup',
  authLimiter,
  validate(schemas.signup),
  async (req, res) => {
    try {
      const { name, email, password, phone, organization } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        if (existingUser.isEmailVerified) {
          return res.status(409).json({
            error: 'Registration failed',
            message: 'An account with this email already exists. Please log in instead.',
          });
        }
        // Unverified re-registration: resend the OTP only. Never overwrite
        // credentials and never issue tokens (account-takeover fix).
        const resentOtp = await existingUser.generateOtp();
        await existingUser.save();
        try {
          await sendVerificationEmail(normalizedEmail, existingUser.name, resentOtp);
        } catch (emailErr) {
          console.error('[Signup Email Error]:', emailErr.message);
        }
        return res.status(200).json({
          message: 'Account already registered. Verification code resent to email.',
          email: normalizedEmail,
          isEmailVerified: false,
        });
      }

      const user = new User({
        name,
        email: normalizedEmail,
        password,
        phone,
        organization,
      });

      const otp = await user.generateOtp();
      await user.save();

      try {
        await sendVerificationEmail(normalizedEmail, user.name, otp);
      } catch (emailErr) {
        console.error('[Signup Email Error]:', emailErr.message);
      }

      // No tokens here: the session is only issued after email verification.
      res.status(201).json({
        message: 'Account created successfully. Verification code sent to email.',
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
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

      if (!user.isEmailVerified) {
        return res.status(403).json({
          error: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before logging in.',
        });
      }

      const accessToken = generateAccessToken(user._id, user.role);
      const rawRefreshToken = await createAndAttachRefreshToken(user, req, res);

      user.lastLoginAt = new Date();
      await user.save();

      res.json({
        message: 'Login successful',
        token: accessToken,
        accessToken,
        refreshToken: rawRefreshToken,
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
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'No refresh token provided',
      });
    }

    const tokenHash = hashToken(rawToken);

    let storedTokenDoc = await RefreshToken.findOneAndUpdate(
      {
        tokenHash,
        revoked: false,
        expiresAt: { $gt: new Date() },
      },
      { $set: { revoked: true } }
    ).populate('user');

    if (!storedTokenDoc) {
      // Grace period for concurrent requests: if rotated within last 60 seconds, grant fresh access token
      const recentlyRevoked = await RefreshToken.findOne({
        tokenHash,
        revoked: true,
        updatedAt: { $gt: new Date(Date.now() - 60 * 1000) },
        expiresAt: { $gt: new Date() },
      }).populate('user');

      if (recentlyRevoked && recentlyRevoked.user && recentlyRevoked.user.isActive) {
        if (!recentlyRevoked.user.isEmailVerified) {
          return res.status(403).json({
            error: 'Email not verified',
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before refreshing your session.',
          });
        }
        const user = recentlyRevoked.user;
        const newAccessToken = generateAccessToken(user._id, user.role);
        return res.json({
          message: 'Token rotated successfully',
          accessToken: newAccessToken,
        });
      }
    }

    if (!storedTokenDoc || !storedTokenDoc.user || !storedTokenDoc.user.isActive) {
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'Invalid or revoked refresh token',
      });
    }

    // Defense in depth: a legacy unverified account holding a refresh token
    // must not be able to mint fresh sessions.
    if (!storedTokenDoc.user.isEmailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before refreshing your session.',
      });
    }

    const user = storedTokenDoc.user;
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = await createAndAttachRefreshToken(user, req, res);

    res.json({
      message: 'Token rotated successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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
router.get('/verify', authLimiter, async (req, res) => {
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

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address first.',
      });
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

// Verify Email OTP (NovaMind auth pattern)
router.post('/verify-email', authLimiter, validate(schemas.verifyEmail), async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+emailOtp +emailOtpExpiry');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await user.verifyOtp(code.trim());
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const rawRefreshToken = await createAndAttachRefreshToken(user, req, res);

    res.json({
      message: 'Email verified successfully.',
      token: accessToken,
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed', message: error.message });
  }
});

// Forgot Password (Sends Resend OTP email)
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Security: return success even if user not found
      return res.json({ message: 'If an account exists, a 6-digit password reset code has been sent.' });
    }

    const otp = await user.generateOtp();
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, user.name, otp);
    } catch (emailErr) {
      console.error('[Forgot Password Email Error]:', emailErr.message);
    }

    res.json({ message: 'If an account exists, a 6-digit password reset code has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Forgot password failed', message: error.message });
  }
});

// Reset Password (Verifies OTP & updates password with strong password policy)
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+emailOtp +emailOtpExpiry');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await user.verifyOtp(code.trim());
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Revoke every session: refresh tokens issued before the reset must die
    // with the old password.
    await RefreshToken.deleteMany({ user: user._id });

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ error: 'Reset password failed', message: error.message });
  }
});

// Resend OTP Code
router.post('/resend-otp', authLimiter, validate(schemas.resendOtp), async (req, res) => {
  try {
    const { email, type = 'verification' } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const otp = await user.generateOtp();
    await user.save();

    if (type === 'reset' || type === 'password_reset') {
      await sendPasswordResetEmail(user.email, user.name, otp);
    } else {
      await sendVerificationEmail(user.email, user.name, otp);
    }

    res.json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Resend OTP failed', message: error.message });
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
      isEmailVerified: req.user.isEmailVerified,
      createdAt: req.user.createdAt,
    },
  });
});

export { router as authRoutes };
export default router;
