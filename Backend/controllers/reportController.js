import Report from '../models/Report.js';
import WeatherSnapshot from '../models/WeatherSnapshot.js';
import SatelliteAnalysis from '../models/SatelliteAnalysis.js';
import AIAnalysis from '../models/AIAnalysis.js';
import { ROLES } from '../models/User.js';
import { REPORT_CATEGORIES } from '../constants/categories.js';
import { resolveDistrictAndCity, resolveCity, isLocationInPakistan } from '../services/boundaryService.js';
import { enrichAndSaveSnapshot } from '../services/weatherService.js';
import { triggerReportEnrichment } from '../services/mlServiceClient.js';
import { snapToGrid } from '../services/anonymizationService.js';
import { assertTransition } from '../utils/reportLifecycle.js';
import { logAuditEvent } from '../middleware/auditLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_CATEGORIES = Object.values(REPORT_CATEGORIES);
const MAX_CAUSES = 10;
const MAX_CAUSE_LENGTH = 80;

/** Validate the citizen-supplied `causes` array; returns the cleaned array. */
function parseCauses(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    const err = new Error('Causes must be an array of strings.');
    err.statusCode = 400;
    throw err;
  }
  if (raw.length > MAX_CAUSES) {
    const err = new Error(`At most ${MAX_CAUSES} causes are accepted.`);
    err.statusCode = 400;
    throw err;
  }
  return raw.map((c) => {
    if (typeof c !== 'string' || !c.trim()) {
      const err = new Error('Each cause must be a non-empty string.');
      err.statusCode = 400;
      throw err;
    }
    if (c.trim().length > MAX_CAUSE_LENGTH) {
      const err = new Error(`Each cause must be at most ${MAX_CAUSE_LENGTH} characters.`);
      err.statusCode = 400;
      throw err;
    }
    return c.trim();
  });
}

/**
 * Validate the citizen-supplied observation time. Returns a Date or null.
 * It must be a real date and not in the future (small clock skew allowed).
 */
function parseObservedAt(raw) {
  if (raw == null || raw === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error('observedAt must be a valid date/time.');
    err.statusCode = 400;
    throw err;
  }
  if (d.getTime() > Date.now() + 5 * 60 * 1000) {
    const err = new Error('observedAt cannot be in the future.');
    err.statusCode = 400;
    throw err;
  }
  return d;
}

// NOTE: This controller never fabricates data. Database failures surface as
// 503; missing required fields surface as 400. There are no mock fallbacks.

// Statuses a non-admin may ever see on the public listing. Moderation
// internals (flagged / rejected) are admin-only; a public `?status=`
// value outside this list is rejected instead of honored.
const PUBLIC_REPORT_STATUSES = ['pending', 'verified'];

export const getReports = async (req, res) => {
  try {
    const { status, severity, limit, area } = req.query;
    const isAdmin = req.user && String(req.user.role).toLowerCase() === ROLES.ADMIN;
    const filter = {};
    if (status && status !== 'all') {
      const wanted = status.toLowerCase();
      if (!isAdmin && !PUBLIC_REPORT_STATUSES.includes(wanted)) {
        return res.status(400).json({
          error: 'Invalid status filter',
          message: `Public report listing supports only: ${PUBLIC_REPORT_STATUSES.join(', ')}.`,
        });
      }
      filter.status = wanted;
    } else if (!isAdmin) {
      filter.status = { $in: PUBLIC_REPORT_STATUSES };
    }
    // No-fabrication policy: synthetic demo rows never appear on the public
    // listing. Admins see everything (they moderate it).
    if (!isAdmin) {
      filter.isSynthetic = { $ne: true };
    }
    if (severity && severity !== 'all') {
      filter.severityLevel = parseInt(severity, 10);
    }
    if (area && area !== 'all') {
      // Escape regex metacharacters: the area filter is a literal substring
      // search, not a user-supplied pattern (ReDoS hardening — a crafted
      // pattern like (a+)+$ would otherwise be evaluated server-side).
      const escapedArea = area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.areaName = { $regex: escapedArea, $options: 'i' };
    }

    // Privacy: reporter name/email is populated for admins only. The
    // public endpoint must not hand every visitor PII alongside exact
    // GPS coordinates. (`isAdmin` was computed above, next to the
    // status-filter allowlist.)
    let query = Report.find(filter);
    if (isAdmin) {
      query = query.populate('user', 'name email');
    }
    query = query.sort({ createdAt: -1 });
    let cappedLimit = 100;
    if (limit !== undefined && limit !== '') {
      const parsed = parseInt(limit, 10);
      if (isNaN(parsed) || !/^-?\d+$/.test(String(limit).trim())) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'limit must be a valid integer',
        });
      }
      cappedLimit = Math.min(Math.max(parsed, 1), 1000);
    }
    query = query.limit(cappedLimit);

    const reports = await query;

    // Privacy: the public endpoint returns a safe DTO. Exact GPS coordinates
    // (latitude/longitude + the `coordinates` virtual) and reporter identity
    // never leave the server for non-admins — map pins use the snapped
    // (grid-anonymized) location instead. Admins keep the full documents.
    const payload = isAdmin
      ? reports
      : reports.map((r) => ({
          id: r._id,
          city: r.city,
          area: r.areaName,
          severity: r.severityLevel,
          category: r.category,
          status: r.status,
          description: r.description,
          causes: r.causes,
          observedAt: r.observedAt,
          source: r.source,
          location: r.snappedLocation ?? null,
          hasPhoto: Boolean(r.image || (r.images && r.images.length > 0)),
          createdAt: r.createdAt,
        }));

    res.json({
      message: 'Reports retrieved successfully',
      reports: payload,
      total: payload.length,
    });
  } catch (error) {
    console.error('getReports DB error:', error.message);
    res
      .status(503)
      .json({ error: 'Service unavailable', message: 'Database unavailable. Please try again.' });
  }
};

export const submitReport = async (req, res) => {
  try {
    let data = req.body;

    if (req.body.reportData) {
      try {
        data = JSON.parse(req.body.reportData);
      } catch (e) {
        return res.status(400).json({ error: 'Validation failed', message: 'Invalid reportData JSON.' });
      }
    }

    const { location, severity, severityLevel, description, areaName, temperature, category, causes, observedAt } =
      data;
    const user = req.user || { _id: null, name: 'Anonymous', email: '', role: 'USER' };

    // Location is required: a heat report without coordinates is meaningless,
    // and defaulting to a city center would fabricate data.
    const lat = location?.lat ?? data.lat ?? data.latitude;
    const lng = location?.lng ?? data.lng ?? data.longitude;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (
      lat == null ||
      lng == null ||
      Number.isNaN(latNum) ||
      Number.isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Report location (valid lat/lng) is required.',
      });
    }

    // Severity is required (1-5): never assume a default on the citizen's behalf.
    const severityNum = Number(severity ?? severityLevel);
    if (!Number.isInteger(severityNum) || severityNum < 1 || severityNum > 5) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Severity (integer 1-5) is required.',
      });
    }

    // Temperature is optional. When absent it stays null — never a fake 38.0.
    const tempNum = temperature == null ? null : Number(temperature);
    if (tempNum != null && (Number.isNaN(tempNum) || tempNum < -50 || tempNum > 70)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Temperature must be a plausible number when provided.',
      });
    }

    // Category comes from a closed enum — never store free text.
    const categoryValue = category || REPORT_CATEGORIES.URBAN_HEAT_ISLAND;
    if (!VALID_CATEGORIES.includes(categoryValue)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}.`,
      });
    }

    // Citizen-supplied context the frontend collects (previously dropped).
    let causesList;
    let observedAtDate;
    try {
      causesList = parseCauses(causes);
      observedAtDate = parseObservedAt(observedAt);
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({
        error: 'Validation failed',
        message: validationError.message,
      });
    }

    // Validate that the report is located within Pakistan
    if (!isLocationInPakistan(latNum, lngNum)) {
      return res.status(400).json({
        error: 'Validation failed',
        message:
          'Report location is outside Pakistan (outside our supported cities).',
      });
    }

    // Resolve city: check canonical pilot cities first, otherwise fall back to areaName or 'Pakistan'
    let city = resolveCity(latNum, lngNum);
    if (!city) {
      city = data.city || areaName || 'Pakistan';
    }
    const geofence = resolveDistrictAndCity(latNum, lngNum, areaName);
    const snappedCoords = snapToGrid(latNum, lngNum);

    const reportData = {
      user: user._id,
      userId: user._id,
      latitude: latNum,
      longitude: lngNum,
      location: { lat: latNum, lng: lngNum },
      snappedLocation: snappedCoords,
      areaName: areaName || geofence.areaName || city,
      district: geofence.district || (areaName && areaName.includes('Division') ? areaName : null),
      city,
      severityLevel: severityNum,
      severity: severityNum,
      ambientTemp: tempNum,
      temperature: tempNum,
      description,
      category: categoryValue,
      causes: causesList,
      observedAt: observedAtDate,
      source: 'Citizen',
      status: 'pending',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      images: req.file ? [`/uploads/${req.file.filename}`] : [],
      reportRef: `HTX-${Date.now().toString().slice(-6)}`,
    };

    const newReport = new Report(reportData);
    await newReport.save();

    // Log PDPB Privacy & Governance Audit Event
    logAuditEvent({
      action: 'REPORT_SUBMITTED',
      performedBy: user._id,
      targetType: 'REPORT',
      targetId: newReport._id,
      details: { district: geofence.district, city, snappedCoords },
      req
    });

    // Weather snapshot enrichment runs first; the ML trigger fires only
    // after it settles. enrichAndSaveSnapshot never rejects — it resolves
    // null when the provider is unavailable — so by the time enrichment
    // runs, weather is either complete or explicitly unavailable. The ML
    // pipeline must never run QC against a snapshot that is still in
    // flight. Submission itself stays non-blocking: the 201 below is sent
    // without awaiting either step, and the ML client retries failures
    // with backoff (see mlServiceClient).
    enrichAndSaveSnapshot(newReport._id, latNum, lngNum)
      .then(async (snapshot) => {
        if (snapshot) {
          newReport.weatherSnapshotRef = snapshot._id;
          await newReport.save();
        } else {
          console.warn(
            `Weather unavailable for report ${newReport._id}: ML enrichment will run with an explicit no-weather state.`
          );
        }
      })
      .catch((err) => console.warn('Weather snapshot async error:', err.message))
      .finally(() => {
        // Non-blocking ML trigger call — after weather has settled.
        triggerReportEnrichment(newReport._id);
      });

    res
      .status(201)
      .json({ message: 'Report submitted successfully', report: newReport });
  } catch (error) {
    console.error('Submit error:', error);
    res
      .status(503)
      .json({ error: 'Service unavailable', message: 'Could not save the report. Please try again.' });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user._id;
    const reports = await Report.find({ $or: [{ user: userId }, { userId }] }).sort({
      createdAt: -1,
    });
    res.json({ reports, user: req.user });
  } catch (error) {
    console.error('getMyReports DB error:', error.message);
    res
      .status(503)
      .json({ error: 'Service unavailable', message: 'Database unavailable. Please try again.' });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate('weatherSnapshotRef')
      .populate('satelliteAnalysisRef')
      .populate('aiAnalysisRef');

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('getReportById DB error:', error.message);
    res
      .status(503)
      .json({ error: 'Service unavailable', message: 'Database unavailable. Please try again.' });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const previousStatus = report.status;

    // Enforce the lifecycle state machine in one place. Illegal moves
    // (e.g. rejected → verified) and unknown statuses are 400.
    let nextStatus;
    try {
      nextStatus = assertTransition(report.status, status);
    } catch (transitionError) {
      return res.status(transitionError.statusCode || 400).json({
        error: 'Invalid status transition',
        code: transitionError.code,
        message: transitionError.message,
      });
    }

    report.status = nextStatus;
    await report.save();

    if (req.user) {
      logAuditEvent({
        action: 'REPORT_MODERATE',
        performedBy: req.user._id,
        targetType: 'Report',
        targetId: report._id,
        details: { from: previousStatus, to: nextStatus, area: report.areaName },
      }).catch((err) => console.error('Audit log error:', err));
    }

    res.json({ message: 'Report status updated', report });
  } catch (error) {
    console.error('updateReportStatus DB error:', error.message);
    res
      .status(503)
      .json({ error: 'Service unavailable', message: 'Database unavailable. Please try again.' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const isAdmin = String(req.user?.role || '').toLowerCase() === ROLES.ADMIN;
    const requesterId = String(req.user?._id || '');
    const isOwner =
      (report.user && String(report.user) === requesterId) ||
      (report.userId && String(report.userId) === requesterId);

    // Citizen self-delete is legitimate but narrow: only the owner's own
    // report, and only while it is still pending (unmoderated). Anything
    // under moderation is evidence — only an admin can remove it.
    if (!isAdmin) {
      if (!isOwner) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own reports.',
        });
      }
      if (report.status !== 'pending') {
        return res.status(400).json({
          error: 'Cannot delete report',
          code: 'DELETE_ONLY_PENDING',
          message: `Reports with status '${report.status}' can only be deleted by an admin.`,
        });
      }
    }

    // Cascade: leave no orphaned enrichment rows behind.
    await WeatherSnapshot.deleteMany({ report: report._id });
    await SatelliteAnalysis.deleteMany({ report: report._id });
    await AIAnalysis.deleteMany({ report: report._id });

    // Remove the uploaded photo, if it was stored locally. Uploads live in
    // Backend/uploads/ (multer destination); __dirname here is
    // Backend/controllers/, so resolve one level up. path.basename keeps a
    // malicious image value from escaping the uploads directory.
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const localImage = report.image && report.image.startsWith('/uploads/')
      ? path.join(uploadsDir, path.basename(report.image))
      : null;
    if (localImage) {
      try {
        fs.unlinkSync(localImage);
      } catch {
        // Already gone or unreadable — the DB row is what matters.
      }
    }

    const deleteFilter = isAdmin
      ? { _id: id }
      : {
          _id: id,
          status: 'pending',
          $or: [{ user: req.user?._id }, { userId: req.user?._id }],
        };

    const deleted = await Report.findOneAndDelete(deleteFilter);
    if (!deleted) {
      return res.status(400).json({
        error: 'Cannot delete report',
        code: 'DELETE_ONLY_PENDING',
        message: `Reports with status '${report.status}' can only be deleted by an admin.`,
      });
    }

    if (req.user) {
      logAuditEvent({
        action: 'REPORT_DELETED',
        performedBy: req.user._id,
        targetType: 'Report',
        targetId: report._id,
        details: { status: report.status, byAdmin: isAdmin },
      }).catch((err) => console.error('Audit log error:', err));
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('deleteReport DB error:', error.message);
    res
      .status(503)
      .json({ error: 'Service unavailable', message: 'Database unavailable. Please try again.' });
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
