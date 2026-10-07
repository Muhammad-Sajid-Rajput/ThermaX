/**
 * Spreadsheet formula-injection guard: a cell whose text begins with
 * =, +, - or @ (or a tab/CR) executes as a formula when the CSV is opened
 * in Excel/Sheets. Prefixing with a single quote neutralizes it while
 * keeping the value visible. Applied to every free-text cell — district,
 * city, category and status are all citizen- or admin-supplied strings.
 */
function sanitizeCsvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvText(value) {
  return `"${sanitizeCsvCell(value ?? '').replace(/"/g, '""')}"`;
}

export function generateCSV(aggregatedData) {
  const headers = ['ReportID', 'Date', 'District', 'City', 'Latitude', 'Longitude', 'Severity', 'Temperature_C', 'Category', 'Status'];
  const rows = (aggregatedData.reports || []).map(r => [
    csvText(r.reportRef || r._id),
    new Date(r.createdAt || Date.now()).toISOString().split('T')[0],
    csvText(r.district),
    csvText(r.city),
    r.latitude ?? r.location?.lat ?? '',
    r.longitude ?? r.location?.lng ?? '',
    r.severityLevel ?? r.severity ?? '',
    // Never invent a temperature in exports: empty cell when unmeasured.
    r.ambientTemp ?? r.temperature ?? '',
    csvText(r.category || 'urban_heat_island'),
    csvText(r.status || 'pending')
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Insights cell writer. Free text always goes through csvText (and therefore
 * the formula-injection guard). Finite numbers are written raw so a negative
 * value such as a -1.4 temperature delta stays numeric instead of being
 * turned into text by the guard's "-" prefix rule.
 */
function insightsCell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return String(value);
  return csvText(value);
}

function insightsRow(cells) {
  return cells.map(insightsCell).join(',');
}

/**
 * Flatten the area-insights payload (services/insightsService.js) into CSV
 * sections: SUMMARY (scope + data-quality footnote + KPIs + baseline),
 * TAKEAWAYS, SEVERITY_DISTRIBUTION, VOLUME_SERIES, TEMP_SERIES,
 * HOTSPOT_RANKING and TOP_DIRECTIVES. Section markers and header rows are
 * constants; every data cell goes through insightsCell.
 */
export function generateInsightsCSV(payload) {
  const { scope, dataQuality, summary, baseline } = payload;
  const lines = [];
  const section = (name, headers, rows, note) => {
    if (lines.length > 0) lines.push('');
    lines.push(`SECTION,${name}`);
    lines.push(headers.join(','));
    if (note) lines.push(`note,${insightsCell(note)}`);
    if (name === 'SUMMARY') {
      rows.forEach((row) => lines.push([row[0], insightsCell(row[1])].join(',')));
    } else {
      rows.forEach((row) => lines.push(insightsRow(row)));
    }
  };

  const flaggedPercent =
    dataQuality.reportCount > 0
      ? Number(((dataQuality.flaggedCount / dataQuality.reportCount) * 100).toFixed(1))
      : null;

  section('SUMMARY', ['key', 'value'], [
    ['scope.city', scope.city],
    ['scope.area', scope.area],
    ['scope.days', scope.days],
    ['scope.from', scope.from],
    ['scope.to', scope.to],
    ['dataQuality.reportCount', dataQuality.reportCount],
    ['dataQuality.verifiedCount', dataQuality.verifiedCount],
    ['dataQuality.flaggedCount', dataQuality.flaggedCount],
    ['dataQuality.flaggedPercent (derived)', flaggedPercent],
    ['dataQuality.trendEligible', dataQuality.trendEligible],
    ['dataQuality.minReportsForTrend', dataQuality.minReportsForTrend],
    ['dataQuality.syntheticExcluded', dataQuality.syntheticExcluded],
    ['dataQuality.hotspotRunId', dataQuality.hotspotRunId],
    ['summary.totalReports', summary.totalReports],
    ['summary.avgTemp', summary.avgTemp],
    ['summary.peakTemp', summary.peakTemp],
    ['summary.avgSeverity', summary.avgSeverity],
    ['summary.activeHotspots', summary.activeHotspots],
    ['summary.criticalHotspots', summary.criticalHotspots],
    ['baseline.cityAvgTemp', baseline.cityAvgTemp],
    ['baseline.areaAvgTempDelta', baseline.areaAvgTempDelta],
    ['baseline.cityReportCount', baseline.cityReportCount],
  ]);

  section('TAKEAWAYS', ['takeaway'], payload.takeaways.map((t) => [t]));

  section(
    'SEVERITY_DISTRIBUTION',
    ['severity', 'count'],
    payload.severityDistribution.map((s) => [s.severity, s.count])
  );

  const withheld = dataQuality.trendEligible
    ? null
    : `trends withheld: fewer than ${dataQuality.minReportsForTrend} verified reports in this window`;
  section(
    'VOLUME_SERIES',
    ['date', 'count'],
    payload.volumeSeries.map((p) => [p.date, p.count]),
    withheld
  );
  section(
    'TEMP_SERIES',
    ['date', 'avgTemp'],
    payload.tempSeries.map((p) => [p.date, p.avgTemp]),
    withheld
  );

  section(
    'HOTSPOT_RANKING',
    [
      'rank',
      'clusterId',
      'area',
      'reportCount',
      'tvi',
      'riskTier',
      'peakTemp',
      'heatIndexMean',
      'centroidLat',
      'centroidLng',
      'directiveIds',
    ],
    payload.hotspots.map((h, i) => [
      i + 1,
      h.clusterId,
      h.area,
      h.reportCount,
      h.tvi,
      // Unscored hotspots are labeled, never zeroed.
      h.tvi == null ? 'unscored' : h.riskTier,
      h.peakTemp,
      h.heatIndexMean,
      h.centroid?.lat,
      h.centroid?.lng,
      (h.directives || []).map((d) => d.id).join(';'),
    ])
  );

  section(
    'TOP_DIRECTIVES',
    ['directiveId', 'text', 'hotspotCount'],
    payload.topDirectives.map((d) => [d.id, d.text, d.hotspotCount])
  );

  return lines.join('\n');
}

export default { generateCSV, generateInsightsCSV };
