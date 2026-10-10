import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { buildInsights, InsightsValidationError } from '../services/insightsService.js';
import { dbFailureStatus } from '../utils/dbErrors.js';

const router = express.Router();

// Admin-only, consistent with routes/exports.js: insights bundle aggregates
// derived from citizen report data and must never be public.
router.use(authenticate);
router.use(authorizeAdmin);

function sendError(res, error, action) {
  if (error instanceof InsightsValidationError) {
    return res.status(400).json({ error: 'Invalid insights query', message: error.message });
  }
  // A DB failure is an unavailable data source (503), never an empty payload.
  const status = dbFailureStatus(error);
  console.error(`Insights ${action} error:`, error);
  return res.status(status).json({
    error: `Failed to ${action}`,
    message: status === 503 ? 'Database unavailable' : 'An error occurred building insights',
  });
}

// GET /api/v1/insights?city=&area=&days=&includeSynthetic=
router.get('/', async (req, res) => {
  try {
    res.json(await buildInsights(req.query));
  } catch (error) {
    sendError(res, error, 'build insights');
  }
});

export default router;
export { router as insightsRoutes };
