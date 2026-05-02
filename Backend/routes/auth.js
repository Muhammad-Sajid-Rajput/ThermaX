import express from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { validate, schemas } from '../middleware/validation.js';
import { rateLimit } from 'express-rate-limit';
import { mockSignup, mockLogin, mockVerifyToken } from '../utils/mockAuth.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// User signup
router.post(
  '/signup',
  authLimiter,
  validate(schemas.signup),
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Try database first, fall back to mock
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(409).json({
            error: 'Registration failed',
            message: 'Email is already registered',
          });
        }

        // Create new user
        const user = new User({
          name,
          email,
          password,
        });

        await user.save();

        // Generate JWT token
        const token = generateToken(user._id, user.role);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Return token and user info
        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          },
        });
      } catch (dbError) {
        // Fallback to mock authentication
        console.log('Database unavailable, using mock auth');
        const result = await mockSignup({ name, email, password });

        res.status(201).json({
          ...result,
          user: {
            id: result.user._id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            createdAt: result.user.createdAt,
          },
        });
      }
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

      // Try database first, fall back to mock
      try {
        // Find user by email with password
        const user = await User.findByEmailWithPassword(email);

        if (!user) {
          return res.status(401).json({
            error: 'Login failed',
            message: 'Invalid email or password',
          });
        }

        // Check if user is active
        if (!user.isActive) {
          return res.status(401).json({
            error: 'Login failed',
            message: 'Account is deactivated',
          });
        }

        // Compare password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
          return res.status(401).json({
            error: 'Login failed',
            message: 'Invalid email or password',
          });
        }

        // Generate JWT token
        const token = generateToken(user._id, user.role);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Return token and user info
        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
          },
        });
      } catch (dbError) {
        // Fallback to mock authentication
        console.log('Database unavailable, using mock auth');
        const result = await mockLogin({ email, password });

        res.json({
          ...result,
          user: {
            id: result.user._id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            lastLogin: result.user.lastLogin,
            createdAt: result.user.createdAt,
          },
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message || 'Internal server error',
      });
    }
  }
);

// Verify token endpoint (for frontend to check token validity)
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Verification failed',
        message: 'No token provided',
      });
    }

    // This will throw an error if token is invalid
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);

    // Try database first, fall back to mock
    try {
      // Find user to ensure they still exist and are active
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Verification failed',
          message: 'User not found or inactive',
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
    } catch (dbError) {
      // Fallback to mock authentication
      console.log('Database unavailable, using mock auth');
      const user = await mockVerifyToken(decoded);

      res.json({
        message: 'Token is valid',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }
  } catch (error) {
    res.status(401).json({
      error: 'Verification failed',
      message: 'Invalid or expired token',
    });
  }
});

export { router as authRoutes };
