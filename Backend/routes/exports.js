import express from 'express';
import { getExportHistory, generateExport, downloadExport } from '../controllers/exportController.js';

const router = express.Router();

router.get('/history', getExportHistory);
router.post('/generate', generateExport);
router.get('/download/:filename', downloadExport);

export default router;
