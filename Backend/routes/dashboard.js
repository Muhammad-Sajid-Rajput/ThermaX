import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import Report from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';

const router = express.Router();

router.get('/snapshot', optionalAuth, async (req, res) => {
  try {
    const [totalReports, pendingReports, approvedReports, rejectedReports, activeHotspots] = await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'validated' }),
      Report.countDocuments({ status: 'rejected' }),
      Hotspot.countDocuments({ status: 'active' }),
    ]);

    const recentReports = await Report.find({}).sort({ createdAt: -1 }).limit(7).select('createdAt severityLevel');
    const trend = recentReports.reverse().map((r, i) => ({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7],
      reports: 1,
    }));

    const criticalHotspots = await Hotspot.countDocuments({ status: 'active', severity: 'critical' });

    res.json({
      kpis: [
        { label: 'Total Reports', value: String(totalReports), change: `${pendingReports} pending`, tone: 'neutral' },
        { label: 'Active Hotspots', value: String(activeHotspots), change: `${criticalHotspots} critical`, tone: 'warm' },
        { label: 'Validated Reports', value: String(approvedReports), change: `${rejectedReports} rejected`, tone: 'cool' },
        { label: 'Pending Review', value: String(pendingReports), change: 'Awaiting moderation', tone: 'hot' },
      ],
      charts: { trend },
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports,
      activeHotspots,
      criticalHotspots,
      systemHealth: 'operational',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data', message: error.message });
  }
});

router.get('/insight', optionalAuth, (req, res) => {
  res.json({
    explanation: {
      clustering: 'DBSCAN groups nearby heat reports and satellite anomalies into dense neighborhoods.',
      noise: 'Points labeled -1 are treated as noise, filtered from cluster analysis.',
    },
    lastUpdated: new Date().toISOString(),
  });
});

export { router as dashboardRoutes };
