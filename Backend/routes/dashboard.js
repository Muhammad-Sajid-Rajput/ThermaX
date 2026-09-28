import express from 'express';
import mongoose from 'mongoose';
import { optionalAuth } from '../middleware/auth.js';
import Report from '../models/Report.js';
import Hotspot from '../models/Hotspot.js';
import { dbFailureStatus } from '../utils/dbErrors.js';
import { currentHotspotRunFilter } from '../utils/currentHotspotRunFilter.js';

const router = express.Router();

router.get('/snapshot', optionalAuth, async (req, res) => {
  try {
    // No-fabrication policy: every production KPI counts real reports
    // only. Synthetic demo rows are excluded by default and reported as
    // their own separate count below.
    const REAL = { isSynthetic: { $ne: true } };
    // Phase 5/6: hotspot KPIs resolve the publication pointer first so they
    // count exactly the current run per city — the same set /hotspots serves.
    // Counting {status:'active'} alone would double-count the retained
    // previous run.
    const runFilter = await currentHotspotRunFilter();
    const [totalReports, pendingReports, approvedReports, rejectedReports, activeHotspots, syntheticReports] = await Promise.all([
      Report.countDocuments(REAL),
      Report.countDocuments({ ...REAL, status: 'pending' }),
      Report.countDocuments({ ...REAL, status: 'verified' }),
      Report.countDocuments({ ...REAL, status: 'rejected' }),
      Hotspot.countDocuments({ status: 'active', ...runFilter }),
      // Honest labeling: seed/demo rows are counted separately so the admin
      // can tell real submissions apart from synthetic demo data.
      Report.countDocuments({ isSynthetic: true }),
    ]);

    // Real per-day aggregation over the last 7 calendar days (UTC):
    // group by calendar day, zero-fill days with no reports, and label each
    // bucket with its actual weekday — never hardcoded "1 report per day".
    const now = new Date();
    const dayStarts = [];
    for (let i = 6; i >= 0; i--) {
      dayStarts.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i)));
    }
    const perDay = await Report.aggregate([
      { $match: { createdAt: { $gte: dayStarts[0] }, isSynthetic: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);
    const countsByDay = new Map(perDay.map((d) => [d._id, d.count]));
    const trend = dayStarts.map((d) => ({
      label: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      reports: countsByDay.get(d.toISOString().slice(0, 10)) || 0,
    }));

    const criticalHotspots = await Hotspot.countDocuments({ status: 'active', severity: 'critical', ...runFilter });
    // TVI-derived risk tier is a separate signal from temperature severity:
    // `severity: 'critical'` = peak citizen temperature ≥ 43°C,
    // `riskTier: 'critical'` = TVI ≥ 0.65 (heat + reports + population).
    const criticalRiskTierHotspots = await Hotspot.countDocuments({ status: 'active', riskTier: 'critical', ...runFilter });

    res.json({
      kpis: [
        { label: 'Total Reports', value: String(totalReports), change: `${pendingReports} pending`, tone: 'neutral' },
        { label: 'Active Hotspots', value: String(activeHotspots), change: `${criticalHotspots} temp-severity critical · ${criticalRiskTierHotspots} TVI-critical`, tone: 'warm' },
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
      criticalRiskTierHotspots,
      syntheticReports,
      // Derived from the live DB connection — never a hardcoded claim.
      systemHealth: mongoose.connection.readyState === 1 ? 'operational' : 'degraded',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    res.status(dbFailureStatus(error)).json({
      error: 'Failed to fetch dashboard data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred fetching dashboard data',
    });
  }
});

export { router as dashboardRoutes };
