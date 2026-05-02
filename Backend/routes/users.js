import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = express.Router();

// Mock users for fallback
const MOCK_USERS = [
  {
    _id: '65f1a2b3c4d5e6f7a8b9c0d1',
    name: 'John Admin',
    email: 'admin@thermax.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: '65f1a2b3c4d5e6f7a8b9c0d3',
    name: 'Ahmed Khan',
    email: 'ahmed@example.com',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
  },
];

// Get current user profile
router.get('/profile', authenticate, (req, res) => {
  res.json({
    message: 'Profile retrieved successfully',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
});

// Update current user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    // Only allow updating name field for now
    if (name && name.trim()) {
      try {
        req.user.name = name.trim();
        await req.user.save();
      } catch (dbError) {
        req.user.name = name.trim(); // Mock update
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Internal server error',
    });
  }
});

// Admin only: Get all users
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    let users;
    try {
      users = await User.find({}).select('-password').sort({ createdAt: -1 });
    } catch (dbError) {
      console.log('DB unavailable, using mock users');
      users = MOCK_USERS;
    }

    res.json({
      message: 'Users retrieved successfully',
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to retrieve users',
      message: 'Internal server error',
    });
  }
});

// Admin only: Update user role
router.put('/:userId/role', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be one of: USER, ADMIN',
      });
    }

    try {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No user found with the provided ID',
        });
      }

      // Prevent users from changing their own role
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(403).json({
          error: 'Role change denied',
          message: 'You cannot change your own role',
        });
      }

      user.role = role;
      await user.save();

      res.json({
        message: 'User role updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          updatedAt: user.updatedAt,
        },
      });
    } catch (dbError) {
      const user = MOCK_USERS.find((u) => u._id === userId);
      if (!user)
        return res.status(404).json({ error: 'User not found (Mock)' });
      user.role = role;
      res.json({ message: 'User role updated (Mock Mode)', user });
    }
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      error: 'Failed to update user role',
      message: 'Internal server error',
    });
  }
});

// Admin only: Deactivate/activate user
router.put(
  '/:userId/status',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      try {
        const user = await User.findById(userId);

        if (!user) {
          return res.status(404).json({
            error: 'User not found',
            message: 'No user found with the provided ID',
          });
        }

        // Prevent users from deactivating themselves
        if (user._id.toString() === req.user._id.toString()) {
          return res.status(403).json({
            error: 'Status change denied',
            message: 'You cannot change your own status',
          });
        }

        user.isActive = isActive;
        await user.save();

        res.json({
          message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            updatedAt: user.updatedAt,
          },
        });
      } catch (dbError) {
        const user = MOCK_USERS.find((u) => u._id === userId);
        if (!user)
          return res.status(404).json({ error: 'User not found (Mock)' });
        user.isActive = isActive;
        res.json({ message: `User status updated (Mock Mode)`, user });
      }
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        error: 'Failed to update user status',
        message: 'Internal server error',
      });
    }
  }
);

export { router as userRoutes };
