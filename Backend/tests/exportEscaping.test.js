import { describe, it, expect } from 'vitest';
import { generateBriefingHTMLBuffer } from '../services/briefingExportService.js';

function payload(overrides = {}) {
  return {
    city: 'Karachi',
    fromDate: new Date('2026-09-01T00:00:00Z'),
    toDate: new Date('2026-09-27T00:00:00Z'),
    totalReports: 3,
    avgTemp: 34.2,
    peakTemp: 41.0,
    activeHotspotsCount: 2,
    reports: [],
    ...overrides,
  };
}

describe('briefingExportService — HTML escaping (pre-Phase-6 review)', () => {
  it('escapes a malicious city name in title and subtitle', async () => {
    const buf = await generateBriefingHTMLBuffer(
      payload({ city: '"><script>alert(1)</script>' })
    );
    const html = buf.toString('utf-8');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes citizen-supplied report-row fields', async () => {
    const buf = await generateBriefingHTMLBuffer(
      payload({
        reports: [
          {
            reportRef: 'HTX-1"><img src=x onerror=alert(2)>',
            district: '<b>Gulshan</b>',
            severityLevel: 5,
            ambientTemp: 39.5,
            status: 'verified',
          },
        ],
      })
    );
    const html = buf.toString('utf-8');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
    expect(html).not.toContain('<b>Gulshan</b>');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
    expect(html).toContain('&lt;b&gt;Gulshan&lt;/b&gt;');
    // Legitimate values still render.
    expect(html).toContain('5/5');
    expect(html).toContain('39.5°C');
  });

  it('escapes ampersands and quotes', async () => {
    const buf = await generateBriefingHTMLBuffer(
      payload({
        city: 'Fish & "Chips" Town',
        reports: [{ reportRef: "HTX-'2'", district: 'D & D', severityLevel: 3 }],
      })
    );
    const html = buf.toString('utf-8');
    expect(html).toContain('Fish &amp; &quot;Chips&quot; Town');
    expect(html).toContain('HTX-&#39;2&#39;');
  });

  it('renders a well-formed document with no reports', async () => {
    const html = (await generateBriefingHTMLBuffer(payload())).toString('utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('THERMAX URBAN HEAT ISLAND EXECUTIVE BRIEFING');
    expect(html).toContain('</html>');
  });
});
