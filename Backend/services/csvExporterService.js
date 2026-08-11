export function generateCSV(aggregatedData) {
  const headers = ['ReportID', 'Date', 'District', 'City', 'Latitude', 'Longitude', 'Severity', 'Temperature_C', 'Category', 'Status'];
  const rows = (aggregatedData.reports || []).map(r => [
    r.reportRef || r._id,
    new Date(r.createdAt || Date.now()).toISOString().split('T')[0],
    `"${(r.district || 'Karachi South').replace(/"/g, '""')}"`,
    `"${(r.city || 'Karachi').replace(/"/g, '""')}"`,
    r.latitude || r.location?.lat || 24.8607,
    r.longitude || r.location?.lng || 67.0011,
    r.severityLevel || r.severity || 3,
    r.ambientTemp || r.temperature || 38.0,
    `"${(r.category || 'urban_heat_island').replace(/"/g, '""')}"`,
    r.status || 'pending'
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

export default { generateCSV };
