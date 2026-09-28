import Report from '../models/Report.js';
import WeatherSnapshot from '../models/WeatherSnapshot.js';
import SatelliteAnalysis from '../models/SatelliteAnalysis.js';
import AIAnalysis from '../models/AIAnalysis.js';
import Hotspot from '../models/Hotspot.js';
import { currentHotspotRunFilter } from '../utils/currentHotspotRunFilter.js';

export async function aggregateReportData(filters = {}) {
  // No city default: a missing city must be rejected by the caller (400),
  // never silently scoped to Karachi.
  const { city, fromDate, toDate, includeSynthetic } = filters;
  const query = {};
  if (city) query.city = city;
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }
  // No-fabrication policy: synthetic (seed/demo) rows never feed exported
  // analytics unless the caller deliberately opts in (includeSynthetic).
  if (!includeSynthetic) {
    query.isSynthetic = { $ne: true };
  }

  // DB failures propagate to the caller — never answer with fabricated
  // empty datasets. Callers translate these into honest 503 responses.
  const reports = await Report.find(query)
    .populate('weatherSnapshotRef')
    .populate('satelliteAnalysisRef')
    .populate('aiAnalysisRef')
    .sort({ createdAt: -1 });

  const hotspots = await Hotspot.find(await currentHotspotRunFilter(city));

  const totalReports = reports.length;
  // Only real measurements feed the aggregates — never a fake 38.0.
  const temps = reports
    .map(r => r.ambientTemp ?? r.temperature)
    .filter(t => t != null);
  const avgTemp = temps.length ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)) : null;
  const peakTemp = temps.length ? Number(Math.max(...temps).toFixed(1)) : null;

  return {
    city,
    fromDate: fromDate || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    toDate: toDate || new Date().toISOString(),
    totalReports,
    avgTemp,
    peakTemp,
    activeHotspotsCount: hotspots.length,
    reports,
    hotspots
  };
}

export default { aggregateReportData };
