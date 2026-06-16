// Minimal RFC-4180-ish CSV parser — handles quoted fields, escaped quotes ("")
// and commas/newlines inside quotes. No external dependency required.

export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  while (i < normalized.length) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }

    if (char === '"') { inQuotes = true; i += 1; continue; }
    if (char === ',') { pushField(); i += 1; continue; }
    if (char === '\n') { pushRow(); i += 1; continue; }
    field += char; i += 1;
  }

  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

// Parses a CSV with a header row into objects, mapping header text
// (trimmed, lowercased) to the keys provided in headerMap. Unmapped
// columns are ignored.
export const parseCsvToObjects = (
  text: string,
  headerMap: Record<string, string>,
): Record<string, string>[] => {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const keys = headers.map((h) => headerMap[h] ?? null);

  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, idx) => {
      if (key) obj[key] = (row[idx] ?? '').trim();
    });
    return obj;
  });
};
