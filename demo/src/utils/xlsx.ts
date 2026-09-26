// Minimal .xlsx reader — extracts the first worksheet into a 2D string array.
// Uses JSZip (already bundled via docx) and the browser DOMParser, so no heavy
// spreadsheet dependency is required. Good enough for well-formed export files.

import JSZip from 'jszip';

// "B" -> 1, "AA" -> 26 (zero-based)
const colToIndex = (col: string): number => {
  let n = 0;
  for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
  return n - 1;
};

const textOf = (nodes: HTMLCollectionOf<Element>): string => {
  let s = '';
  for (let i = 0; i < nodes.length; i++) s += nodes[i].textContent ?? '';
  return s;
};

const cellText = (cell: Element, shared: string[]): string => {
  const type = cell.getAttribute('t');
  if (type === 's') {
    const v = cell.getElementsByTagName('v')[0];
    if (!v) return '';
    return shared[Number(v.textContent)] ?? '';
  }
  if (type === 'inlineStr') {
    const is = cell.getElementsByTagName('is')[0];
    return is ? textOf(is.getElementsByTagName('t')) : '';
  }
  const v = cell.getElementsByTagName('v')[0];
  return v?.textContent ?? '';
};

export const parseXlsx = async (data: ArrayBuffer): Promise<string[][]> => {
  const zip = await JSZip.loadAsync(data);

  // Shared strings table (optional)
  const shared: string[] = [];
  const sstFile = zip.file('xl/sharedStrings.xml');
  if (sstFile) {
    const doc = new DOMParser().parseFromString(await sstFile.async('string'), 'application/xml');
    const siNodes = doc.getElementsByTagName('si');
    for (let i = 0; i < siNodes.length; i++) {
      shared.push(textOf(siNodes[i].getElementsByTagName('t')));
    }
  }

  // First worksheet by file name (sheet1, sheet2, …)
  const sheetName = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort()[0];
  if (!sheetName) throw new Error('No worksheet was found in this Excel file.');

  const sheetXml = await zip.file(sheetName)!.async('string');
  const doc = new DOMParser().parseFromString(sheetXml, 'application/xml');

  const rows: string[][] = [];
  const rowNodes = doc.getElementsByTagName('row');
  for (let r = 0; r < rowNodes.length; r++) {
    const cells = rowNodes[r].getElementsByTagName('c');
    const rowArr: string[] = [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const ref = cell.getAttribute('r') || '';
      const letters = ref.replace(/[0-9]/g, '');
      const idx = letters ? colToIndex(letters) : rowArr.length;
      while (rowArr.length < idx) rowArr.push('');
      rowArr[idx] = cellText(cell, shared).trim();
    }
    rows.push(rowArr);
  }

  return rows.filter((row) => row.some((cell) => cell !== ''));
};

// Maps a header row + body rows into objects, keyed via headerMap
// (header text trimmed + lowercased). Unmapped columns are ignored.
export const rowsToObjects = (
  rows: string[][],
  headerMap: Record<string, string>,
): Record<string, string>[] => {
  if (rows.length === 0) return [];
  const keys = rows[0].map((h) => headerMap[h.trim().toLowerCase()] ?? null);
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, idx) => {
      if (key) obj[key] = (row[idx] ?? '').trim();
    });
    return obj;
  });
};
