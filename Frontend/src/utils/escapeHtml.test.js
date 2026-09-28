import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
  it('escapes the classic stored-XSS payload', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
  });

  it('escapes quotes and ampersands', () => {
    expect(escapeHtml('a&b"c\'d')).toBe('a&amp;b&quot;c&#39;d');
  });

  it('passes numbers through as strings', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(4.5)).toBe('4.5');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Karachi — Gulshan-e-Iqbal')).toBe('Karachi — Gulshan-e-Iqbal');
  });
});
