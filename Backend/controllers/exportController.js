import fs from 'fs';
import path from 'path';
import GeneratedReport from '../models/GeneratedReport.js';
import { aggregateReportData } from '../services/reportAggregationService.js';
import { generateBriefingHTMLBuffer } from '../services/briefingExportService.js';
import { isDatabaseError } from '../utils/dbErrors.js';

const EXPORT_DIR = path.join(process.cwd(), 'uploads/exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Turn a user-supplied city into a filesystem-safe slug.
 * Returns null when nothing safe can be derived — raw user input is never
 * placed in a path.
 */
export function slugifyCity(city) {
  if (typeof city !== 'string') return null;
  const slug = city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

export async function getExportHistory(req, res) {
  try {
    const history = await GeneratedReport.find().sort({ createdAt: -1 });
    res.json({ history, count: history.length });
  } catch (error) {
    // A DB failure is an unavailable data source, not an empty history:
    // never answer 200 with a fabricated empty list.
    res.status(503).json({ error: 'Export history unavailable', message: 'Database unavailable' });
  }
}

export async function generateExport(req, res) {
  const { city, format = 'html', fromDate, toDate, includeSynthetic } = req.body || {};

  if (typeof city !== 'string' || !city.trim()) {
    return res.status(400).json({ error: 'Invalid city', message: 'A non-empty city string is required.' });
  }

  // Honest format contract: only 'html' exists.
  if (format !== 'html') {
    return res.status(400).json({
      error: 'Unsupported format',
      message: `Format '${format}' is not available. Only 'html' export is supported.`,
    });
  }

  const citySlug = slugifyCity(city);
  if (!citySlug) {
    return res.status(400).json({ error: 'Invalid city', message: 'City cannot be turned into a safe export name.' });
  }

  // A city is a name, not a path: reject anything that looks like path
  // traversal or contains path separators, even though the slug above
  // already keeps the filename safe.
  if (/[/\\]/.test(city) || city.includes('..')) {
    return res.status(400).json({ error: 'Invalid city', message: 'City must not contain path characters.' });
  }

  if (fromDate != null && fromDate !== '') {
    const parsedFrom = new Date(fromDate);
    if (isNaN(parsedFrom.getTime())) {
      return res.status(400).json({ error: 'Invalid fromDate', message: 'fromDate must be a valid ISO date string.' });
    }
  }

  if (toDate != null && toDate !== '') {
    const parsedTo = new Date(toDate);
    if (isNaN(parsedTo.getTime())) {
      return res.status(400).json({ error: 'Invalid toDate', message: 'toDate must be a valid ISO date string.' });
    }
  }

  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    return res.status(400).json({ error: 'Invalid date range', message: 'fromDate cannot be after toDate.' });
  }

  let filePath = null;
  try {
    // No-fabrication policy: synthetic (seed/demo) rows are excluded from
    // exported briefings unless the caller deliberately opts in with
    // includeSynthetic: true — e.g. the FYP demo running on the seed set.
    const aggregated = await aggregateReportData({
      city: city.trim(),
      fromDate,
      toDate,
      includeSynthetic: includeSynthetic === true,
    });

    const ref = `EXP-${Date.now().toString().slice(-6)}`;
    const filename = `${ref}_${citySlug}.html`;
    filePath = path.join(EXPORT_DIR, filename);

    const contentBuffer = await generateBriefingHTMLBuffer(aggregated);

    fs.writeFileSync(filePath, contentBuffer);

    let exportDoc;
    try {
      exportDoc = new GeneratedReport({
        reportRef: ref,
        city: city.trim(),
        fromDate: aggregated.fromDate,
        toDate: aggregated.toDate,
        exportUrl: `/exports/${filename}`,
        blobPath: filePath,
        fileSizeBytes: contentBuffer.length,
        generatedBy: req.user?._id || null
      });
      await exportDoc.save();
    } catch (dbErr) {
      // Never fabricate an in-memory exportDoc when the database save fails:
      // the export cannot be tracked, so the request fails honestly.
      try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // best-effort orphan cleanup only
      }
      return res.status(503).json({ error: 'Failed to generate export', message: 'Database unavailable' });
    }

    res.status(201).json({
      message: 'Export briefing generated successfully',
      format,
      export: exportDoc,
      downloadUrl: `/api/v1/exports/download/${filename}`
    });
  } catch (error) {
    console.error('Generate export error:', error);
    // Validation 400s return above, so anything reaching here is a backend
    // failure — 503 for DB/aggregation problems, 500 for genuine bugs.
    if (isDatabaseError(error)) {
      return res.status(503).json({ error: 'Failed to generate export', message: 'Database or data service unavailable' });
    }
    res.status(500).json({ error: 'Failed to generate export' });
  }
}

export async function downloadExport(req, res) {
  try {
    const { filename } = req.params;

    // Path-traversal guard: the parameter must be a bare filename, never a
    // path. Anything else (.., /, \, drive letters) is rejected.
    if (typeof filename !== 'string' || path.basename(filename) !== filename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.resolve(EXPORT_DIR, filename);
    if (!filePath.startsWith(EXPORT_DIR + path.sep) && filePath !== EXPORT_DIR) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    const contentType = filename.endsWith('.csv') ? 'text/csv' : 'text/html';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
}

export default { getExportHistory, generateExport, downloadExport, slugifyCity };
