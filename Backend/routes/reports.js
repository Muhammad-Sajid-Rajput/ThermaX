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
router.post(
  '/',
  authenticate,
  upload.single('image'),
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

// Moderate a report (approve / reject)
router.patch(
  '/:id/moderate',
  authenticate,
  authorizeAdmin,
  reportController.updateReportStatus
);

// Delete a report
router.delete(
  '/:id',
  authenticate,
  authorizeAdmin,
  reportController.deleteReport ||
    ((req, res) => res.status(501).json({ message: 'Not implemented' }))
);

/**
 * POST /api/reports/generate
 * Generate a mitigation report (PDF or CSV briefing package).
 * ⛔ ADMIN ONLY — accessible only to users with role === "ADMIN".
 */
router.post('/generate', authenticate, authorizeAdmin, (req, res) => {
  // Placeholder until a real generateReport controller is implemented.
  const { type = 'PDF' } = req.body;
  const reportId = `EXP-${Date.now().toString().slice(-5)}`;
  return res.status(200).json({
    reportId,
    type,
    status: 'Completed',
    generatedAt: new Date().toISOString(),
    generatedBy: req.user._id,
    message: `${type} report generated successfully.`,
  });
});

export { router as reportRoutes };
