import express from 'express';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Mock hotspots data
const MOCK_HOTSPOTS = [
  {
    id: 'CL-01',
    clusterId: 'CL-01',
    area: 'Saddar',
    avgTemperature: 41.6,
    avgSeverity: 4.2,
    priority: 'Critical',
    confidence: 0.93,
    reportCount: 15,
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [67.0224, 24.8582],
            [67.0348, 24.8582],
            [67.0348, 24.8482],
            [67.0224, 24.8482],
            [67.0224, 24.8582],
          ],
        ],
      },
    },
  },
  {
    id: 'CL-02',
    clusterId: 'CL-02',
    area: 'Korangi',
    avgTemperature: 40.8,
    avgSeverity: 3.9,
    priority: 'High',
    confidence: 0.86,
    reportCount: 12,
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [67.1325, 24.8356],
            [67.1465, 24.8356],
            [67.1465, 24.8247],
            [67.1325, 24.8247],
            [67.1325, 24.8356],
          ],
        ],
      },
    },
  },
];

router.get('/', optionalAuth, (req, res) => {
  res.json({
    message: 'Hotspots retrieved successfully',
    hotspots: MOCK_HOTSPOTS,
    lastUpdated: new Date().toISOString(),
  });
});

export { router as hotspotRoutes };
