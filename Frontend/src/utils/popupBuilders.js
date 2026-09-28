import { escapeHtml } from './escapeHtml';

/**
 * Leaflet popup HTML builders.
 *
 * Leaflet's `bindPopup(html)` sets `innerHTML`, so every value that comes
 * from the API (report descriptions, area names, hotspot labels — and even
 * "numeric" fields, which a compromised payload could turn into strings)
 * is escaped or coerced here. Components must build popups through these
 * builders, never by hand-rolled template literals.
 */

function safeSeverity(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : 'N/A';
}

function safeTemp(value) {
  return value != null ? `${escapeHtml(value)}°C` : 'N/A';
}

/** Hotspot popup shared by the dashboard map and the report mini-map. */
export function buildHotspotPopup(hotspot, color = '#0f766e') {
  const hs = hotspot || {};
  const label = hs.severityLabel || hs.priority;
  return `
    <div style="min-width:200px;font-family:Inter,sans-serif;line-height:1.5">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1e293b;">
        ${escapeHtml(hs.area || hs.id || 'Hotspot Area')}
      </div>
      <span style="background:${color}22;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;display:inline-block;margin-bottom:8px;">
        ${escapeHtml(label)}
      </span>
      <div style="font-size:12px;color:#475569">
        <div style="display:flex; justify-content:space-between;">
          <span>Avg Temp:</span> <b>${safeTemp(hs.avgTemp ?? hs.avgTemperature)}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Avg Severity:</span> <b>${escapeHtml(safeSeverity(hs.avgSeverity))}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Reports:</span> <b>${escapeHtml(hs.reportCount ?? 0)}</b>
        </div>
      </div>
    </div>`;
}

/** Citizen-report marker popup (dashboard map + report mini-map). */
export function buildReportPopup(report) {
  const r = report || {};
  const areaLine =
    escapeHtml(r.area || '') + (r.category ? ' · ' + escapeHtml(r.category) : '');
  return `
    <div style="min-width:210px;font-family:Inter,sans-serif;line-height:1.5">
      <div style="font-weight:700;font-size:13px;margin-bottom:1px">${escapeHtml(r.id || 'Report')}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:5px">${areaLine}</div>
      <div style="font-size:12px;color:#334155;margin-bottom:5px">${escapeHtml(r.description || 'No description provided.')}</div>
      <div style="font-size:11px;color:#94a3b8">
        <b>Source:</b> ${escapeHtml(r.source || 'User')} &nbsp;·&nbsp; <b>Severity:</b> ${escapeHtml(r.severity)}/5
      </div>
    </div>`;
}

export default { buildHotspotPopup, buildReportPopup };
