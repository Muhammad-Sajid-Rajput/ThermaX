import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import Report from '../models/Report.js';
import { dbFailureStatus } from '../utils/dbErrors.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    // Privacy + honesty: the public heatmap plots grid-anonymized snapped
    // points — never a citizen's exact GPS. Moderation-internal statuses
    // (flagged/rejected) and synthetic demo rows are excluded; including
    // them would leak queue internals and fabricate heat.
    const query = {
      status: { $in: ['pending', 'verified'] },
      isSynthetic: { $ne: true },
    };
    if (typeof req.query.city === 'string' && req.query.city.trim()) {
      query.city = req.query.city.trim();
    }
    const reports = await Report.find(query).select('snappedLocation severityLevel status').limit(1000);
    // Reports without a snapped grid point are skipped: pinning them to a
    // city center would fabricate heatmap points. Rows without a severity
    // are skipped too: defaulting them to 3 would invent heat intensity.
    const heatmap = reports
      .filter(r => r.snappedLocation?.lat != null && r.snappedLocation?.lng != null && r.severityLevel != null)
      .map(r => ({
        lat: r.snappedLocation.lat,
        lng: r.snappedLocation.lng,
        intensity: Math.min(1.0, r.severityLevel / 5),
      }));
    res.json({ message: 'Heatmap data retrieved successfully', heatmap, total: heatmap.length, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({
      error: 'Failed to fetch heatmap data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred fetching heatmap data',
      heatmap: [],
    });
  }
});

export { router as heatmapRoutes };
