import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Export Routes
 * ⛔ ALL routes in this file are ADMIN ONLY.
 *
 * Every route uses both:
 *   1. authenticate    — verifies a valid JWT is present
 *   2. authorizeAdmin  — rejects anyone without role === "ADMIN"
 *
 * A non-admin hitting any of these endpoints will receive:
 *   HTTP 403  { error: "Access denied", message: "Admin privileges required..." }
 */

// ─── In-memory placeholder history (replace with DB queries) ──────────────
const MOCK_HISTORY = [
  {
    id: 'EXP-9001',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'PDF',
    status: 'Completed',
    name: 'Daily hotspot bulletin',
  },
  {
    id: 'EXP-9002',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'CSV',
    status: 'Completed',
    name: 'User report extract',
  },
  {
    id: 'EXP-9003',
    date: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'PDF',
    status: 'Processing',
    name: 'Weekly mitigation summary',
  },
];

/**
 * GET /api/exports/history
 * Returns the admin's export/download history.
 * ⛔ ADMIN ONLY
 */
router.get('/history', authenticate, authorizeAdmin, (req, res) => {
  // TODO: replace with a real DB query filtered by req.user._id or org
  return res.status(200).json({
    exports: MOCK_HISTORY,
    total: MOCK_HISTORY.length,
    generatedBy: req.user._id,
  });
});

/**
 * POST /api/exports/generate
 * Trigger generation of a PDF or CSV export package.
 * ⛔ ADMIN ONLY
 *
 * Body: { type: "PDF" | "CSV", range?: "7d" | "30d" | "24h" }
 */
router.post('/generate', authenticate, authorizeAdmin, (req, res) => {
  const { type = 'PDF', range = '7d' } = req.body;

  if (!['PDF', 'CSV'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid export type',
      message: 'type must be "PDF" or "CSV"',
    });
  }

  // TODO: enqueue a real export job (e.g., Bull/BullMQ queue)
  const exportRecord = {
    id: `EXP-${Date.now().toString().slice(-5)}`,
    type,
    range,
    status: 'Completed',
    name: type === 'PDF' ? 'Mitigation briefing' : 'Heat data extract',
    generatedAt: new Date().toISOString(),
    generatedBy: req.user._id,
  };

  return res.status(200).json(exportRecord);
});

/**
 * DELETE /api/exports/:id
 * Remove an export record from history.
 * ⛔ ADMIN ONLY
 */
router.delete('/:id', authenticate, authorizeAdmin, (req, res) => {
  // TODO: delete from DB
  return res.status(200).json({
    message: `Export ${req.params.id} deleted successfully.`,
    deletedBy: req.user._id,
  });
});

export { router as exportRoutes };
