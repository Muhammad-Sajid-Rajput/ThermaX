import fs from 'fs';
import path from 'path';

function generateTrendSVG(reports = []) {
  if (!reports || reports.length === 0) {
    return '<div style="height: 100px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; font-size: 12px;">No trend data</div>';
  }
  const countsByDate = new Map();
  for (const r of reports) {
    const d = new Date(r.createdAt || r.timestamp || Date.now());
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
  }
  const dates = Array.from(countsByDate.keys()).sort();
  if (dates.length === 0) {
    return '<div style="height: 100px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; font-size: 12px;">No trend data</div>';
  }
  const maxVal = Math.max(1, ...dates.map((d) => countsByDate.get(d)));
  const width = 280;
  const height = 80;
  const paddingX = 10;
  const paddingY = 8;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const points = dates.map((d, i) => {
    const x = paddingX + (dates.length > 1 ? (i / (dates.length - 1)) * chartW : chartW / 2);
    const count = countsByDate.get(d) || 0;
    const y = paddingY + chartH - (count / maxVal) * chartH;
    return { x, y, count, date: d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(paddingY + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingY + chartH).toFixed(1)} Z`;

  const formatDateLabel = (dStr) => {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const firstLabel = formatDateLabel(dates[0]);
  const lastLabel = formatDateLabel(dates[dates.length - 1]);

  return `
    <svg width="100%" height="100" viewBox="0 0 ${width} ${height + 20}" style="overflow: visible;">
      <defs>
        <linearGradient id="trendGradHtml" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stop-color="#10b981" stop-opacity="0.3" />
          <stop offset="95%" stop-color="#10b981" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <line x1="${paddingX}" y1="${paddingY + chartH}" x2="${paddingX + chartW}" y2="${paddingY + chartH}" stroke="#f1f5f9" stroke-width="1" />
      <path d="${areaD}" fill="url(#trendGradHtml)" />
      <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <text x="${paddingX}" y="${height + 14}" font-size="9" fill="#94a3b8" font-family="sans-serif">${firstLabel}</text>
      <text x="${paddingX + chartW}" y="${height + 14}" font-size="9" fill="#94a3b8" text-anchor="end" font-family="sans-serif">${lastLabel}</text>
    </svg>
  `;
}

function generateSeveritySVG(reports = []) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const r of reports) {
    const lvl = Number(r.severityLevel ?? r.severity);
    if (lvl >= 1 && lvl <= 5) {
      counts[lvl]++;
      total++;
    }
  }
  const maxVal = Math.max(1, ...Object.values(counts));
  const colors = {
    1: '#10b981',
    2: '#60a5fa',
    3: '#facc15',
    4: '#f97316',
    5: '#dc2626',
  };
  const width = 280;
  const height = 80;
  const barWidth = 26;
  const gap = (width - 5 * barWidth) / 6;

  let bars = '';
  for (let s = 1; s <= 5; s++) {
    const val = counts[s];
    const barH = total > 0 && val > 0 ? Math.max(4, (val / maxVal) * 65) : 0;
    const x = gap + (s - 1) * (barWidth + gap);
    const y = height - barH;
    const color = colors[s];
    if (barH > 0) {
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${barH.toFixed(1)}" rx="3" fill="${color}" />`;
    }
    bars += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height + 15}" font-size="10" fill="#64748b" font-weight="600" text-anchor="middle" font-family="sans-serif">S${s}</text>`;
  }

  return `
    <svg width="100%" height="100" viewBox="0 0 ${width} ${height + 20}">
      <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="#f1f5f9" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

function generateHeatIndexSVG(hotspots = [], esc) {
  if (!hotspots || hotspots.length === 0) {
    return '<div style="height: 100px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; font-size: 13px;">No area data</div>';
  }
  const tierColors = {
    critical: '#dc2626',
    high: '#f97316',
    moderate: '#f59e0b',
    low: '#eab308',
    unknown: '#94a3b8',
  };
  const top = hotspots.slice(0, 4);
  const rows = top
    .map((h, i) => {
      const tier = (h.riskTier || 'unknown').toLowerCase();
      const color = tierColors[tier] || '#f59e0b';
      const score = h.tvi != null ? Math.round(h.tvi * 100) : null;
      const area = esc(h.area || h.clusterId || `Zone ${i + 1}`);
      const pct = score != null ? Math.min(100, Math.max(5, score)) : 0;
      const scoreText = score != null ? `${score}% TVI` : 'Unscored';
      return `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span style="font-weight: 600; color: #334155;">${area}</span>
          <span style="font-weight: 700; color: ${color}; font-family: monospace;">${scoreText}</span>
        </div>
        <div style="height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 3px;"></div>
        </div>
      </div>
    `;
    })
    .join('');

  return `<div style="padding-top: 4px;">${rows}</div>`;
}

function generateAmbientTempTrajectorySVG(reports = []) {
  const tempByDate = new Map();
  for (const r of reports) {
    const temp = r.ambientTemp ?? r.temperature;
    if (temp == null || isNaN(temp)) continue;
    const d = new Date(r.createdAt || r.timestamp || Date.now());
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    if (!tempByDate.has(key)) tempByDate.set(key, []);
    tempByDate.get(key).push(Number(temp));
  }
  const dates = Array.from(tempByDate.keys()).sort();
  if (dates.length < 2) {
    return '<div style="height: 130px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; font-size: 12px;">Temporal trends withheld — insufficient verified readings in this observation window.</div>';
  }
  const dailyAverages = dates.map((d) => {
    const arr = tempByDate.get(d);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { date: d, temp: Number(avg.toFixed(1)) };
  });

  const temps = dailyAverages.map((d) => d.temp);
  const minTemp = Math.floor(Math.min(...temps) - 1.5);
  const maxTemp = Math.ceil(Math.max(...temps) + 1.5);
  const tempRange = maxTemp - minTemp || 1;

  const width = 640;
  const height = 140;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;
  const plotW = width - paddingLeft - paddingRight;
  const plotH = height - paddingTop - paddingBottom;

  const points = dailyAverages.map((item, i) => {
    const x = paddingLeft + (i / (dailyAverages.length - 1)) * plotW;
    const y = paddingTop + plotH - ((item.temp - minTemp) / tempRange) * plotH;
    return { x, y, temp: item.temp, date: item.date };
  });

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const midTemp = ((minTemp + maxTemp) / 2).toFixed(1);
  const yTicks = [
    { val: maxTemp.toFixed(1), y: paddingTop },
    { val: midTemp, y: paddingTop + plotH / 2 },
    { val: minTemp.toFixed(1), y: paddingTop + plotH },
  ];

  const gridLines = yTicks
    .map(
      (t) => `
    <line x1="${paddingLeft}" y1="${t.y}" x2="${width - paddingRight}" y2="${t.y}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />
    <text x="${paddingLeft - 6}" y="${t.y + 3}" font-size="9" fill="#94a3b8" text-anchor="end" font-family="monospace">${t.val}</text>
  `
    )
    .join('');

  const circles = points
    .map(
      (p) => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#f59e0b" />
  `
    )
    .join('');

  const formatDateLabel = (dStr) => {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? dStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const xLabels = points
    .filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1)
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="${height - 6}" font-size="9" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">${formatDateLabel(p.date)}</text>`
    )
    .join('');

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
      ${gridLines}
      <path d="${lineD}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
      ${xLabels}
    </svg>
  `;
}

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

  const trendHtml = generateTrendSVG(aggregatedData.reports || []);
  const severityHtml = generateSeveritySVG(aggregatedData.reports || []);
  const heatIndexHtml = generateHeatIndexSVG(aggregatedData.hotspots || [], esc);
  const tempTrajectoryHtml = generateAmbientTempTrajectorySVG(aggregatedData.reports || []);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ThermaX Executive Briefing Report - ${esc(aggregatedData.city)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 36px; color: #1e293b; background: #fff; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 12px; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
    .kpi-container { display: flex; gap: 14px; margin-bottom: 24px; }
    .kpi-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
    .kpi-value { font-size: 26px; font-weight: 800; color: #0f172a; font-family: monospace; }
    .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; font-weight: 700; letter-spacing: 0.05em; }

    /* Visual Analytics 3-Column Grid */
    .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
    .chart-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .chart-title { font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em; }
    .chart-badge { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Ambient Temperature Trajectory Card */
    .trajectory-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }

    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th { background: #0f172a; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }

    @media print {
      body { margin: 16px; }
      .chart-card, .trajectory-card { break-inside: avoid; page-break-inside: avoid; }
    }
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

  <!-- Visual Analytics Section: Report Trend, Severity Mix, Area Heat Index -->
  <div class="analytics-grid">
    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Report Trend</span>
        <span class="chart-badge">30-Day</span>
      </div>
      <div>${trendHtml}</div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Severity Mix</span>
        <span class="chart-badge">S1–S5</span>
      </div>
      <div>${severityHtml}</div>
    </div>

    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Area Heat Index</span>
        <span class="chart-badge">TVI Risk</span>
      </div>
      <div>${heatIndexHtml}</div>
    </div>
  </div>

  <!-- Ambient Temperature Trajectory Card -->
  <div class="trajectory-card">
    <div class="chart-header">
      <span class="chart-title">Ambient Temperature Trajectory</span>
      <span class="chart-badge">${esc(new Date(aggregatedData.fromDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))} — ${esc(new Date(aggregatedData.toDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</span>
    </div>
    <div>${tempTrajectoryHtml}</div>
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
