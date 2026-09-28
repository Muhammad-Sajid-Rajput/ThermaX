import { describe, it, expect } from 'vitest';
import { csvCell } from './csv';

describe('csvCell (formula-injection guard)', () => {
  it("prefixes '=' cells with a single quote", () => {
    expect(csvCell('=SUM(A1:A2)')).toBe(`"'=SUM(A1:A2)"`);
  });

  it("neutralizes '+', '-', '@' prefixes", () => {
    expect(csvCell('+123456')).toBe(`"'+123456"`);
    expect(csvCell('-5')).toBe(`"'-5"`);
    expect(csvCell('@mention')).toBe(`"'@mention"`);
  });

  it('doubles embedded quotes per RFC 4180', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('leaves ordinary text untouched apart from quoting', () => {
    expect(csvCell('Gulshan-e-Iqbal')).toBe('"Gulshan-e-Iqbal"');
    expect(csvCell(42)).toBe('"42"');
  });

  it('handles null/undefined as empty quoted cell', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('defuses the classic payload from a report description', () => {
    const cell = csvCell('=cmd|\'/c calc\'!A0');
    expect(cell.startsWith(`"'=`)).toBe(true);
  });
});
