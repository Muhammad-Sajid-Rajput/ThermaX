import fs from 'fs';
import path from 'path';
import GeneratedReport from '../models/GeneratedReport.js';
import { aggregateReportData } from '../services/reportAggregationService.js';
import { generatePDFBuffer } from '../services/pdfGeneratorService.js';
import { generateCSV } from '../services/csvExporterService.js';

const EXPORT_DIR = path.join(process.cwd(), 'uploads/exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

export async function getExportHistory(req, res) {
  try {
    let history = [];
    try {
      history = await GeneratedReport.find().sort({ createdAt: -1 });
    } catch (e) {
      history = [];
    }
    res.json({ history, count: history.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
}

export async function generateExport(req, res) {
  try {
    const { city = 'Karachi', format = 'pdf', fromDate, toDate } = req.body;
    const aggregated = await aggregateReportData({ city, fromDate, toDate });

    const ref = `EXP-${Date.now().toString().slice(-6)}`;
    const filename = `${ref}_${city.toLowerCase()}.${format === 'csv' ? 'csv' : 'html'}`;
    const filePath = path.join(EXPORT_DIR, filename);

    let contentBuffer;
    if (format === 'csv') {
      const csvStr = generateCSV(aggregated);
      contentBuffer = Buffer.from(csvStr, 'utf-8');
    } else {
      contentBuffer = await generatePDFBuffer(aggregated);
    }

    fs.writeFileSync(filePath, contentBuffer);

    let exportDoc = null;
    try {
      exportDoc = new GeneratedReport({
        reportRef: ref,
        city,
        fromDate: aggregated.fromDate,
        toDate: aggregated.toDate,
        pdfUrl: `/exports/${filename}`,
        blobPath: filePath,
        fileSizeBytes: contentBuffer.length,
        generatedBy: req.user?._id || null
      });
      await exportDoc.save();
    } catch (dbErr) {
      exportDoc = {
        _id: ref,
        reportRef: ref,
        city,
        pdfUrl: `/exports/${filename}`,
        fileSizeBytes: contentBuffer.length
      };
    }

    res.status(201).json({
      message: 'Export briefing generated successfully',
      export: exportDoc,
      downloadUrl: `/api/v1/exports/download/${filename}`
    });
  } catch (error) {
    console.error('Generate export error:', error);
    res.status(500).json({ error: 'Failed to generate export' });
  }
}

export async function downloadExport(req, res) {
  try {
    const { filename } = req.params;
    const filePath = path.join(EXPORT_DIR, filename);

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

export default { getExportHistory, generateExport, downloadExport };
