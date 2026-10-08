import express from 'express';
import {
  authenticate,
  authorizeAdmin,
  optionalAuth,
} from '../middleware/auth.js';
import multer from 'multer';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();
const parseMultipartFields = multer().none();

// ─── PUBLIC / USER ROUTES ──────────────────────────────────────────────────
// Get all heat reports (public read — no auth required)
router.get('/', optionalAuth, reportController.getReports);

// Submit new heat report (any authenticated user — accepts JSON or multipart text fields, no files)
router.post(
  '/',
  authenticate,
  parseMultipartFields,
  reportController.submitReport
);

// Get the current user's own reports (authenticated user)
router.get('/my-reports', authenticate, reportController.getMyReports);

// ─── ADMIN-ONLY ROUTES ─────────────────────────────────────────────────────
// Get all reports with full user info (admin view)
router.get(
  '/admin/all',
  authenticate,
  authorizeAdmin,
  reportController.getReports
);

// Get one report with full enrichment refs (admin moderation detail view).
// Placed after the literal routes above so '/:id' never shadows them.
router.get(
  '/:id',
  authenticate,
  authorizeAdmin,
  reportController.getReportById
);

// Moderate a report (approve / reject)
router.patch(
  '/:id/moderate',
  authenticate,
  authorizeAdmin,
  reportController.updateReportStatus
);
router.put(
  '/:id/status',
  authenticate,
  authorizeAdmin,
  reportController.updateReportStatus
);

// Delete a report — admin can delete anything; a citizen can delete only
// their own report while it is still pending (enforced in the controller).
router.delete(
  '/:id',
  authenticate,
  reportController.deleteReport
);

/**
 * POST /api/reports/generate
 * Legacy stub for report generation (HTML/CSV briefing packages only —
 * there is no PDF engine; see POST /api/v1/exports/generate).
 * ⛔ ADMIN ONLY — accessible only to users with role === "ADMIN".
 *
 * NOTE: this endpoint is not implemented. It is kept (with auth intact) so
 * the router shape stays stable, but it answers honestly with 501 instead
 * of fabricating a reportId and a "Completed" status.
 */
router.post('/generate', authenticate, authorizeAdmin, (req, res) => {
  return res.status(501).json({
    error: 'Not implemented',
    message: 'Report generation is not implemented yet. Use POST /api/v1/exports/generate instead.',
  });
});

export { router as reportRoutes };
