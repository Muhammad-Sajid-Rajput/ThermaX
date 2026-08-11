import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import Report from '../models/Report.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.city) query.city = req.query.city;
    const reports = await Report.find(query).select('latitude longitude severityLevel status').limit(1000);
    const heatmap = reports.map(r => ({
      lat: r.latitude || 24.8607,
      lng: r.longitude || 67.0011,
      intensity: Math.min(1.0, (r.severityLevel || 3) / 5),
    }));
    res.json({ message: 'Heatmap data retrieved successfully', heatmap, total: heatmap.length, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch heatmap data', message: error.message, heatmap: [] });
  }
});

export { router as heatmapRoutes };
