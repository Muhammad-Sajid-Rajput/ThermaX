import Report from '../models/Report.js';
import WeatherSnapshot from '../models/WeatherSnapshot.js';
import SatelliteAnalysis from '../models/SatelliteAnalysis.js';
import AIAnalysis from '../models/AIAnalysis.js';
import Hotspot from '../models/Hotspot.js';

export async function aggregateReportData(filters = {}) {
  const { city = 'Karachi', fromDate, toDate } = filters;
  const query = {};
  if (city) query.city = city;
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  let reports = [];
  try {
    reports = await Report.find(query)
      .populate('weatherSnapshotRef')
      .populate('satelliteAnalysisRef')
      .populate('aiAnalysisRef')
      .sort({ createdAt: -1 });
  } catch (e) {
    reports = [];
  }

  let hotspots = [];
  try {
    hotspots = await Hotspot.find(city ? { city } : {});
  } catch (e) {
    hotspots = [];
  }

  const totalReports = reports.length;
  const temps = reports.map(r => r.ambientTemp || r.temperature || 38.0);
  const avgTemp = totalReports ? (temps.reduce((a, b) => a + b, 0) / totalReports).toFixed(1) : 38.0;
  const peakTemp = totalReports ? Math.max(...temps).toFixed(1) : 42.0;

  return {
    city,
    fromDate: fromDate || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    toDate: toDate || new Date().toISOString(),
    totalReports,
    avgTemp: Number(avgTemp),
    peakTemp: Number(peakTemp),
    activeHotspotsCount: hotspots.length,
    reports,
    hotspots
  };
}

export default { aggregateReportData };
