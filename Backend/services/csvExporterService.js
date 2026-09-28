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

export default { generateCSV };
