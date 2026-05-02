import express from 'express';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Mock heatmap data for Karachi
const MOCK_HEATMAP = [
  { lat: 24.8607, lng: 67.0011, intensity: 0.8 },
  { lat: 24.8532, lng: 67.0284, intensity: 0.9 },
  { lat: 24.8301, lng: 67.1395, intensity: 0.7 },
  { lat: 24.9184, lng: 67.0952, intensity: 0.6 },
  { lat: 24.9386, lng: 67.0417, intensity: 0.5 },
  { lat: 24.8103, lng: 67.0305, intensity: 0.4 },
];

router.get('/', optionalAuth, (req, res) => {
  res.json({
    message: 'Heatmap data retrieved successfully',
    heatmap: MOCK_HEATMAP,
    lastUpdated: new Date().toISOString(),
  });
});

export { router as heatmapRoutes };
