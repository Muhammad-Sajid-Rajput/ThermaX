import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { getExportHistory, generateExport, downloadExport } from '../controllers/exportController.js';

const router = express.Router();

// All export routes are admin-only: exports bundle raw citizen report data,
// so they must never be reachable without an authenticated admin session.
router.use(authenticate);
router.use(authorizeAdmin);

router.get('/history', getExportHistory);
router.post('/generate', generateExport);
router.get('/download/:filename', downloadExport);

export default router;
export { router as exportRoutes };
