/**
 * CSV cell sanitizer — formula-injection guard + RFC 4180 quote escaping.
 *
 * Cells starting with `=`, `+`, `-`, `@`, tab or CR would execute as
 * formulas when the CSV is opened in Excel/Sheets. Prefixing them with a
 * single quote neutralizes the formula while keeping the value readable.
 * Embedded double quotes are doubled per RFC 4180, and every cell is
 * wrapped in quotes.
 */
export function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default csvCell;
