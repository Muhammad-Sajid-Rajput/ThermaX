import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { buildInsights, InsightsValidationError } from '../services/insightsService.js';
import { generateInsightsCSV } from '../services/csvExporterService.js';
import { slugifyCity } from '../controllers/exportController.js';
import { dbFailureStatus } from '../utils/dbErrors.js';

const router = express.Router();

// Admin-only, consistent with routes/exports.js: insights bundle aggregates
// derived from citizen report data and must never be public.
router.use(authenticate);
router.use(authorizeAdmin);

const EXPORT_FORMATS = ['csv', 'json'];

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

// GET /api/v1/insights/export?city=&area=&days=&format=csv|json
// Same payload as GET /, delivered as a download. Honest format contract:
// there is no server-side PDF — use the page's print stylesheet instead.
router.get('/export', async (req, res) => {
  const { format = 'json' } = req.query;
  if (typeof format !== 'string' || !EXPORT_FORMATS.includes(format)) {
    return res.status(400).json({
      error: 'Unsupported format',
      message: `Format '${String(format)}' is not available. Server-side PDF is not implemented — use 'csv' or 'json', or print the page to PDF from the browser.`,
    });
  }

  try {
    const payload = await buildInsights(req.query);
    const filename = `insights-${slugifyCity(payload.scope.city)}-${payload.scope.days}d.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    if (format === 'csv') {
      res.type('text/csv; charset=utf-8');
      return res.send(generateInsightsCSV(payload));
    }
    res.type('application/json');
    return res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    sendError(res, error, 'export insights');
  }
});

export default router;
export { router as insightsRoutes };
