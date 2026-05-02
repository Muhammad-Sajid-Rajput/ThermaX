import express from 'express';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = express.Router();

// Mock data for dashboard KPIs and charts
router.get('/snapshot', optionalAuth, (req, res) => {
  const range = req.query.range || '7d';

  res.json({
    kpis: [
      {
        label: 'Total Reports',
        value: '1,284',
        change: '+12%',
        tone: 'neutral',
      },
      {
        label: 'Active Hotspots',
        value: '18',
        change: '5 critical',
        tone: 'warm',
      },
      {
        label: 'Avg Severity',
        value: '4.2',
        change: 'Citizen + satellite fused',
        tone: 'hot',
      },
      {
        label: 'Satellite Correlation',
        value: '94%',
        change: 'DBSCAN confidence linked',
        tone: 'cool',
      },
    ],
    charts: {
      trend: [
        { label: 'Mon', reports: 120 },
        { label: 'Tue', reports: 150 },
        { label: 'Wed', reports: 180 },
        { label: 'Thu', reports: 140 },
        { label: 'Fri', reports: 190 },
        { label: 'Sat', reports: 220 },
        { label: 'Sun', reports: 210 },
      ],
      severity: [
        { severity: 'S1', value: 100, label: 'Severity 1' },
        { severity: 'S2', value: 200, label: 'Severity 2' },
        { severity: 'S3', value: 400, label: 'Severity 3' },
        { severity: 'S4', value: 300, label: 'Severity 4' },
        { severity: 'S5', value: 284, label: 'Severity 5' },
      ],
      hotspotGrowth: [
        { area: 'Saddar', growth: 45, priority: 'Critical' },
        { area: 'Korangi', growth: 38, priority: 'High' },
        { area: 'Gulshan', growth: 32, priority: 'High' },
        { area: 'Nazimabad', growth: 25, priority: 'Medium' },
        { area: 'Clifton', growth: 18, priority: 'Low' },
      ],
    },
    recommendations: [
      {
        id: 'REC-01',
        area: 'Saddar',
        action: 'Deploy temporary shade and street-side misting',
        priority: 'Critical',
      },
      {
        id: 'REC-02',
        area: 'Korangi',
        action: 'Prioritize tree canopy and reflective surface interventions',
        priority: 'High',
      },
      {
        id: 'REC-03',
        area: 'Gulshan',
        action: 'Monitor and sustain cooling corridors',
        priority: 'Medium',
      },
    ],
    availableAreas: ['Saddar', 'Korangi', 'Gulshan', 'Nazimabad', 'Clifton'],
    lastUpdated: new Date().toISOString(),
  });
});

router.get('/insight', optionalAuth, (req, res) => {
  res.json({
    explanation: {
      clustering:
        'DBSCAN groups nearby heat reports and satellite anomalies into dense neighborhoods.',
      noise:
        'Points labeled -1 are treated as noise, filtered from cluster analysis.',
    },
    lastUpdated: new Date().toISOString(),
  });
});

export { router as dashboardRoutes };
