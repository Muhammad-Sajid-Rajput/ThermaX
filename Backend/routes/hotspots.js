import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import Hotspot from '../models/Hotspot.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const query = { status: 'active' };
    if (req.query.city) query.city = req.query.city;
    const dbHotspots = await Hotspot.find(query).sort({ detectedAt: -1 }).limit(50);
    const hotspots = dbHotspots.map(h => ({
      id: h._id,
      clusterId: h.clusterId,
      area: h.district || h.zone || h.city,
      city: h.city,
      avgTemperature: h.avgTemp,
      peakTemp: h.peakTemp,
      avgSeverity: h.severity === 'critical' ? 5 : h.severity === 'high' ? 4 : h.severity === 'moderate' ? 3 : 2,
      priority: h.severity.charAt(0).toUpperCase() + h.severity.slice(1),
      confidence: 0.85,
      reportCount: h.reportCount || 0,
      status: h.status,
      detectedAt: h.detectedAt,
      centroid: h.centroid,
      geojson: h.boundary ? { type: 'Feature', geometry: h.boundary } : null,
    }));
    res.json({ message: 'Hotspots retrieved successfully', hotspots, total: hotspots.length, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotspots', message: error.message, hotspots: [] });
  }
});

export { router as hotspotRoutes };
