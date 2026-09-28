/**
 * Escape a value for safe interpolation into an HTML string.
 *
 * Leaflet's `bindPopup(html)` sets `innerHTML`, so any string that comes
 * from the API (report descriptions, area names, hotspot labels) must be
 * escaped first — otherwise a citizen can store `<img onerror=…>` in a
 * report description and get stored-XSS on every map that renders it.
 *
 * Numbers/booleans are passed through; null/undefined become ''.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default escapeHtml;
