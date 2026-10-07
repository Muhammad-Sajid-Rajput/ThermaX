import { describe, it, expect } from 'vitest';
import { buildHotspotPopup, buildReportPopup } from './popupBuilders.js';

// Regression tests for stored-XSS via Leaflet popups: bindPopup(html) sets
// innerHTML, so a malicious string stored in ANY report/hotspot field must
// come out escaped. These tests feed payloads through the same builders the
// maps actually use — not through escapeHtml in isolation.
const XSS = `"><img src=x onerror=alert(1)>`;
const ATTR_BREAKOUT = `" onmouseover="alert(2)`;

function setsInnerHTML(html) {
  // What Leaflet does with the popup string: parse it as HTML and look for
  // anything that would execute or break out of its context.
  return new DOMParser().parseFromString(html, 'text/html');
}

// The escaped payload text still contains the WORDS "onerror" etc. as inert
// text — that is fine. What must not exist is a real element or a real
// event-handler attribute in the parsed DOM.
function activeXssVectors(doc) {
  const hits = [];
  if (doc.querySelector('img')) hits.push('<img> element');
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of el.getAttributeNames()) {
      if (/^on/i.test(attr)) hits.push(`handler attribute ${attr}`);
    }
  }
  return hits;
}

describe('popup builders — stored-XSS regression', () => {
  it('buildHotspotPopup neutralizes payloads in every field', () => {
    const html = buildHotspotPopup({
      area: XSS,
      id: XSS,
      priority: XSS,
      severityLabel: ATTR_BREAKOUT,
      avgTemp: XSS,
      avgTemperature: XSS,
      avgSeverity: XSS,
      reportCount: XSS,
    });
    const doc = setsInnerHTML(html);
    expect(activeXssVectors(doc)).toEqual([]);
    expect(html).toContain('&lt;img');
    // A non-numeric severity degrades to 'N/A', never into the markup.
    expect(html).toContain('N/A');
  });

  it('buildHotspotPopup still renders honest numbers', () => {
    const html = buildHotspotPopup({
      area: 'Gulshan',
      priority: 'High',
      avgTemp: 41.5,
      avgSeverity: 4.25,
      reportCount: 12,
    });
    expect(html).toContain('Gulshan');
    expect(html).toContain('41.5°C');
    expect(html).toContain('4.3');
    expect(html).toContain('12');
  });

  it('buildHotspotPopup renders TVI score and risk tier honestly', () => {
    const html = buildHotspotPopup({
      area: 'Gulshan',
      priority: 'High',
      tvi: 0.724,
      riskTier: 'critical',
      avgTemp: 41.5,
      avgSeverity: 4.25,
      reportCount: 12,
    });
    expect(html).toContain('0.72');
    expect(html).toContain('(Critical)');
    expect(html).toContain('TVI: Critical');
  });

  it('buildHotspotPopup neutralizes malicious TVI riskTier injection', () => {
    const html = buildHotspotPopup({
      riskTier: XSS,
      tvi: XSS,
    });
    const doc = setsInnerHTML(html);
    expect(activeXssVectors(doc)).toEqual([]);
    expect(html).toContain('&lt;img');
  });


  it('buildReportPopup neutralizes payloads in every field', () => {
    const html = buildReportPopup({
      id: XSS,
      area: XSS,
      category: XSS,
      description: XSS,
      source: XSS,
      severity: XSS,
    });
    const doc = setsInnerHTML(html);
    expect(activeXssVectors(doc)).toEqual([]);
    expect(html).toContain('&lt;img');
  });

  it('buildReportPopup handles missing fields without "undefined"', () => {
    const html = buildReportPopup({});
    expect(html).not.toContain('undefined');
    expect(html).toContain('No description provided.');
  });
});
