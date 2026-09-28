import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import EnrichmentFailure from '../models/EnrichmentFailure.js';
import { triggerReportEnrichment } from '../services/mlServiceClient.js';
import { dbFailureStatus } from '../utils/dbErrors.js';

const router = express.Router();

router.use(authenticate, authorizeAdmin);

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
