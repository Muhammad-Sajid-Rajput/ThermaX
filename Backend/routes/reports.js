import express from 'express';
import {
  authenticate,
  authorizeAdmin,
  optionalAuth,
} from '../middleware/auth.js';
import * as reportController from '../controllers/reportController.js';
import upload from '../utils/upload.js';

const router = express.Router();

// ─── PUBLIC / USER ROUTES ──────────────────────────────────────────────────
// Get all heat reports (public read — no auth required)
router.get('/', optionalAuth, reportController.getReports);

// Submit new heat report (any authenticated user)
//
// The multer wrapper maps upload failures to an honest 400: the fileFilter
// rejects non-images with 'Error: Images Only!' and the size limiter rejects
// oversize files — both are client errors, not 500s. Without this wrapper,
// multer's error reaches the generic error handler as a 500.
function handleReportUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message =
        typeof err === 'string'
          ? err
          : err.code === 'LIMIT_FILE_SIZE'
            ? 'Image exceeds the 5MB size limit.'
            : err.message || 'Image upload failed.';
      return res.status(400).json({
        error: 'Invalid image upload',
        code: 'INVALID_IMAGE',
        message,
      });
    }
    next();
  });
}

router.post(
  '/',
  authenticate,
  handleReportUpload,
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
