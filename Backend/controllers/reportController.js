import Report from '../models/Report.js';
import { resolveDistrictAndCity } from '../services/boundaryService.js';
import { enrichAndSaveSnapshot } from '../services/weatherService.js';
import { triggerReportEnrichment } from '../services/mlServiceClient.js';
import { snapToGrid } from '../services/anonymizationService.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

let mockReports = [
  {
    _id: 'RPT-2401',
    areaName: 'Saddar',
    district: 'Karachi South',
    city: 'Karachi',
    location: { lat: 24.8528, lng: 67.0296 },
    latitude: 24.8528,
    longitude: 67.0296,
    severity: 5,
    severityLevel: 5,
    timestamp: new Date('2026-04-25T07:40:00+05:00'),
    description:
      'Roadside pavement is radiating intense heat and pedestrians are sheltering under shop shutters.',
    source: 'Citizen',
    category: 'urban_heat_island',
    status: 'pending',
    userName: 'Ahmed Khan',
    userEmail: 'ahmed@example.com',
    userRole: 'USER',
    temperature: 42.3,
    ambientTemp: 42.3,
  },
];

export const getReports = async (req, res) => {
  try {
    let reports;
    try {
      reports = await Report.find().sort({ createdAt: -1 });
    } catch (dbError) {
      console.log('DB unavailable, using mock reports');
      reports = mockReports;
    }

    res.json({
      message: 'Reports retrieved successfully',
      reports,
      total: reports.length,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to fetch reports', message: error.message });
  }
};

export const submitReport = async (req, res) => {
  try {
    let data = req.body;

    if (req.body.reportData) {
      try {
        data = JSON.parse(req.body.reportData);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid reportData format' });
      }
    }

    const { location, severity, description, areaName, temperature, category } =
      data;
    const user = req.user || { _id: null, name: 'Anonymous', email: '', role: 'USER' };

    const lat = location?.lat ?? data.lat ?? data.latitude ?? 24.8607;
    const lng = location?.lng ?? data.lng ?? data.longitude ?? 67.0011;

    // Server-side boundary & district resolution
    const geofence = resolveDistrictAndCity(lat, lng);
    const snappedCoords = snapToGrid(lat, lng);

    const reportData = {
      user: user._id,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      latitude: lat,
      longitude: lng,
      location: { lat, lng },
      snappedLocation: snappedCoords,
      areaName: areaName || geofence.areaName,
      district: geofence.district,
      city: geofence.city,
      severityLevel: severity || 3,
      severity: severity || 3,
      ambientTemp: temperature || 38.0,
      temperature: temperature || 38.0,
      description,
      category: category || 'urban_heat_island',
      source: 'Citizen',
      status: 'pending',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      images: req.file ? [`/uploads/${req.file.filename}`] : [],
      reportRef: `HTX-${Date.now().toString().slice(-6)}`,
    };

    try {
      const newReport = new Report(reportData);
      await newReport.save();

      // Log PDPB Privacy & Governance Audit Event
      logAuditEvent({
        action: 'REPORT_SUBMITTED',
        performedBy: user._id,
        targetType: 'REPORT',
        targetId: newReport._id,
        details: { district: geofence.district, city: geofence.city, snappedCoords },
        req
      });

      // Weather snapshot enrichment (non-blocking if error occurs)
      enrichAndSaveSnapshot(newReport._id, lat, lng)
        .then(async (snapshot) => {
          if (snapshot) {
            newReport.weatherSnapshotRef = snapshot._id;
            await newReport.save();
          }
        })
        .catch((err) => console.warn('Weather snapshot async error:', err.message));

      // Non-blocking ML trigger call
      triggerReportEnrichment(newReport._id);

      res
        .status(201)
        .json({ message: 'Report submitted successfully', report: newReport });
    } catch (dbError) {
      console.log('DB unavailable, using mock storage:', dbError.message);
      const mockReport = { ...reportData, _id: `RPT-${Date.now()}` };
      mockReports.unshift(mockReport);
      res
        .status(201)
        .json({
          message: 'Report submitted successfully (Mock Mode)',
          report: mockReport,
        });
    }
  } catch (error) {
    console.error('Submit error:', error);
    res
      .status(500)
      .json({ error: 'Failed to submit report', message: error.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user._id;
    let reports;
    try {
      reports = await Report.find({ $or: [{ user: userId }, { userId }] }).sort({
        createdAt: -1,
      });
    } catch (dbError) {
      reports = mockReports.filter(
        (r) => r.userId === userId || r.userEmail === req.user.email
      );
    }
    res.json({ reports, user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your reports' });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    let report = await Report.findById(id)
      .populate('weatherSnapshotRef')
      .populate('satelliteAnalysisRef')
      .populate('aiAnalysisRef');

    if (!report) {
      report = mockReports.find((r) => r._id === id || r.id === id);
    }

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report details' });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const report = await Report.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json({ message: 'Report status updated', report });
    } catch (dbError) {
      const index = mockReports.findIndex((r) => r._id === id || r.id === id);
      if (index === -1)
        return res.status(404).json({ error: 'Report not found' });
      mockReports[index].status = status;
      res.json({
        message: 'Report status updated (Mock Mode)',
        report: mockReports[index],
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report status' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await Report.findByIdAndDelete(id);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

export const getUserReports = getMyReports;

export default {
  getReports,
  submitReport,
  getMyReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  getUserReports,
};
