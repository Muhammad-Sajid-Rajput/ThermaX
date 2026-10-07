import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import EnrichmentFailure from '../models/EnrichmentFailure.js';
import AdminNotification from '../models/AdminNotification.js';
import { triggerReportEnrichment } from '../services/mlServiceClient.js';
import { dbFailureStatus } from '../utils/dbErrors.js';

const router = express.Router();

router.use(authenticate, authorizeAdmin);

// GET /api/v1/admin/notifications — unread first, then read, newest first; cap 100.
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await AdminNotification.find()
      .sort({ readAt: 1, createdAt: -1 })
      .populate('reportId', 'reportRef status city createdAt')
      .limit(100)
      .lean();

    // Order unread first (newest first), then read (newest first)
    notifications.sort((a, b) => {
      const aUnread = a.readAt == null;
      const bUnread = b.readAt == null;
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ notifications });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({ error: 'Failed to load notifications.' });
  }
});

// POST /api/v1/admin/notifications/:id/read — mark notification read.
router.post('/notifications/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    const notification = await AdminNotification.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          readAt: new Date(),
          readBy: req.user?._id || null,
        },
      },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({ error: 'Failed to mark notification as read.' });
  }
});

// GET /api/v1/admin/enrichment-failures — open dead letters, newest first.
router.get('/enrichment-failures', async (req, res) => {
  try {
    const failures = await EnrichmentFailure.find({ status: 'open' })
      .populate('report', 'reportRef status city createdAt')
      .sort({ lastAttemptAt: -1 })
      .limit(100)
      .lean();
    res.json({ failures });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({ error: 'Failed to load enrichment failures.' });
  }
});

// POST /api/v1/admin/enrichment-failures/:id/retry — re-queue enrichment.
router.post('/enrichment-failures/:id/retry', async (req, res) => {
  try {
    const failure = await EnrichmentFailure.findById(req.params.id);
    if (!failure || failure.status !== 'open') {
      return res.status(404).json({ error: 'Open enrichment failure not found.' });
    }
    triggerReportEnrichment(failure.report);
    res.json({ message: 'Enrichment re-queued.', id: failure._id });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({ error: 'Failed to re-queue enrichment.' });
  }
});

// POST /api/v1/admin/enrichment-failures/:id/dismiss — manual dismissal.
router.post('/enrichment-failures/:id/dismiss', async (req, res) => {
  try {
    const failure = await EnrichmentFailure.findOneAndUpdate(
      { _id: req.params.id, status: 'open' },
      { $set: { status: 'dismissed', resolvedAt: new Date() } },
      { new: true }
    );
    if (!failure) {
      return res.status(404).json({ error: 'Open enrichment failure not found.' });
    }
    res.json({ message: 'Enrichment failure dismissed.', id: failure._id });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({ error: 'Failed to dismiss enrichment failure.' });
  }
});

export { router as adminRoutes };
export default router;
