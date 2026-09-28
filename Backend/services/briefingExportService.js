import fs from 'fs';
import path from 'path';

/**
 * Generates the executive briefing as an HTML buffer.
 *
 * NOTE: a real PDF engine is deliberately out of scope (parked in the
 * implementation plan's Future Work). The export API therefore offers
 * 'html' and 'csv' formats only — requesting 'pdf' returns an honest 400.
 */
export async function generateBriefingHTMLBuffer(aggregatedData) {
  // Every interpolated value is HTML-escaped: report fields are
  // citizen-supplied and this file is opened in a browser.
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ThermaX Executive Briefing Report - ${esc(aggregatedData.city)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
    .header { border-bottom: 3px solid #ef4444; padding-bottom: 12px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; color: #dc2626; margin: 0; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .kpi-container { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: bold; color: #b91c1c; }
    .kpi-label { font-size: 12px; color: #475569; text-transform: uppercase; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1e293b; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">THERMAX URBAN HEAT ISLAND EXECUTIVE BRIEFING</div>
    <div class="subtitle">City: ${esc(aggregatedData.city)} | Period: ${esc(new Date(aggregatedData.fromDate).toLocaleDateString())} - ${esc(new Date(aggregatedData.toDate).toLocaleDateString())}</div>
  </div>

  <div class="kpi-container">
    <div class="kpi-card">
      <div class="kpi-value">${esc(aggregatedData.totalReports)}</div>
      <div class="kpi-label">Citizen Reports</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${esc(aggregatedData.avgTemp ?? '—')}°C</div>
      <div class="kpi-label">Avg Temperature</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${esc(aggregatedData.peakTemp ?? '—')}°C</div>
      <div class="kpi-label">Peak Temperature</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${esc(aggregatedData.activeHotspotsCount)}</div>
      <div class="kpi-label">Active Hotspots</div>
    </div>
  </div>

  <h3>Thermal Submissions Summary</h3>
  <table>
    <thead>
      <tr>
        <th>Report ID</th>
        <th>District</th>
        <th>Severity</th>
        <th>Temp (°C)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${(aggregatedData.reports || []).slice(0, 15).map(r => `
        <tr>
          <td>${esc(r.reportRef || r._id)}</td>
          <td>${esc(r.district ?? '—')}</td>
          <td>${esc(r.severityLevel ?? r.severity ?? '—')}/5</td>
          <td>${esc(r.ambientTemp ?? r.temperature ?? '—')}°C</td>
          <td>${esc(r.status || 'pending')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    ThermaX Geospatial Platform — Confidential Academic & Municipal Review Copy
  </div>
</body>
</html>
  `;

  return Buffer.from(htmlContent, 'utf-8');
}

export default { generateBriefingHTMLBuffer };
