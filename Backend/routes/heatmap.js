import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import Report from '../models/Report.js';
import { dbFailureStatus } from '../utils/dbErrors.js';
import { snapToGrid } from '../services/anonymizationService.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    // Privacy + honesty: the public heatmap plots grid-anonymized snapped
    // points — never a citizen's exact GPS. Moderation-internal statuses
    // (flagged/rejected) are excluded; demo rows are included only when
    // INCLUDE_SYNTHETIC_REPORTS=true.
    const query = {
      status: { $in: ['pending', 'verified'] },
    };
    if (process.env.INCLUDE_SYNTHETIC_REPORTS !== 'true' && req.query.includeSynthetic !== 'true') {
      query.isSynthetic = { $ne: true };
    }
    if (typeof req.query.city === 'string' && req.query.city.trim()) {
      query.city = req.query.city.trim();
    }
    const reports = await Report.find(query).select('snappedLocation latitude longitude severityLevel status').limit(1000);
    // Reports without a snapped grid point fall back to snapToGrid on their real coordinates.
    // Rows without coordinates or severity are skipped.
    const heatmap = reports
      .map(r => {
        const snapped = (r.snappedLocation?.lat != null && r.snappedLocation?.lng != null)
          ? r.snappedLocation
          : snapToGrid(r.latitude, r.longitude);
        if (!snapped || snapped.lat == null || snapped.lng == null || r.severityLevel == null) return null;
        return {
          lat: snapped.lat,
          lng: snapped.lng,
          intensity: Math.min(1.0, r.severityLevel / 5),
        };
      })
      .filter(Boolean);
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
