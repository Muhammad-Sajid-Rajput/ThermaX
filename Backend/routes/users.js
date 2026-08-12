import express from 'express';
import { User, ROLES } from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.use(authenticate);

// Get list of users (Admin only)
router.get('/', authorizeAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
});


// Governance Audit Log viewer (Admin only) — must be BEFORE /:id
router.get('/audit-logs', authorizeAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const AuditLog = (await import('../models/AuditLog.js')).default;
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied', message: 'Unauthorized' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Not found', message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
});

// Update user role (Admin only, with last-admin safeguard)
router.put('/:id/role', authorizeAdmin, strictLimiter, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !Object.values(ROLES).includes(role.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${Object.values(ROLES).join(', ')}`,
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Not found', message: 'User not found' });
    }

    const newRole = role.toLowerCase();

    // Safeguard: Block demoting the last remaining admin user
    if (targetUser.role === ROLES.ADMIN && newRole !== ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Action blocked',
          message: 'Cannot demote the last remaining admin user in the system.',
        });
      }
    }

    targetUser.role = newRole;
    await targetUser.save();

    res.json({
      message: `User ${targetUser.email} role updated to ${newRole}`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role', message: error.message });
  }
});

// Toggle user activation status (Admin only)
router.put('/:id/status', authorizeAdmin, strictLimiter, async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid input', message: 'isActive must be a boolean' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Not found', message: 'User not found' });
    }

    if (targetUser.role === ROLES.ADMIN && !isActive) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Action blocked',
          message: 'Cannot deactivate the last active admin user.',
        });
      }
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    res.json({
      message: `User ${targetUser.email} is now ${isActive ? 'active' : 'deactivated'}`,
      user: {
        id: targetUser._id,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status', message: error.message });
  }
});


export { router as userRoutes };
export default router;
