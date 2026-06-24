import JsBarcode from 'jsbarcode';

// ─── Book ID generation ─────────────────────────────────────────────────────────
// Every distinct book gets one 8-digit base ID. Each physical copy is identified
// by appending `c<copyNumber>` — e.g. base "05923465" with 2 copies prints as
// 05923465c1 and 05923465c2. Same book → same base ID, different copy suffix.

export const generateBookId = (existing: Set<string>): string => {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const id = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    if (!existing.has(id)) return id;
  }
  throw new Error('Could not generate a unique book ID. Please try again.');
};

export const copyBarcodeValue = (bookId: string, copy: number): string => `${bookId}c${copy}`;

// ─── Printable barcode sheet ────────────────────────────────────────────────────

export interface BarcodeBook {
  bookId: string;
  title: string;
  copies: number;
  accessions?: string[]; // per-copy accession numbers (copy n -> accessions[n-1])
}

// Distinct, print-friendly group colors. Copies of the same book share a color so
// they stay identifiable as a group after the sheet is cut apart; consecutive
// books cycle through the palette.
const GROUP_COLORS = [
  '#FDE68A', '#BFDBFE', '#BBF7D0', '#FBCFE8', '#DDD6FE', '#FED7AA',
  '#A7F3D0', '#FECACA', '#E9D5FF', '#C7D2FE', '#FEF08A', '#99F6E4',
];

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ));

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const buildBarcodeSheetHtml = (books: BarcodeBook[]): string => {
  const canvas = document.createElement('canvas');
  let totalLabels = 0;

  const groups = books.map((book, index) => {
    const color = GROUP_COLORS[index % GROUP_COLORS.length];
    const copies = Math.max(1, Math.floor(book.copies) || 1);
    const labels: string[] = [];

    for (let copy = 1; copy <= copies; copy++) {
      const value = copyBarcodeValue(book.bookId, copy);
      try {
        JsBarcode(canvas, value, {
          format: 'CODE128',
          width: 2,
          height: 48,
          fontSize: 13,
          margin: 6,
          displayValue: true,
          background: '#ffffff',
        });
      } catch {
        continue;
      }
      totalLabels += 1;
      const accession = book.accessions?.[copy - 1];
      labels.push(
        `<div class="label" style="border-color:${color}">
           <div class="ltitle">${escapeHtml(truncate(book.title || 'Untitled', 40))}</div>
           <img src="${canvas.toDataURL('image/png')}" alt="${escapeHtml(value)}" />
           <div class="lmeta">Copy ${copy} of ${copies}${accession ? ` · Acc. ${escapeHtml(accession)}` : ''}</div>
         </div>`,
      );
    }

    return `<section class="group">
       <div class="ghead" style="background:${color}">
         ${escapeHtml(truncate(book.title || 'Untitled', 64))}
         <span class="gid">ID ${escapeHtml(book.bookId)} · ${copies} cop${copies === 1 ? 'y' : 'ies'}</span>
       </div>
       <div class="labels">${labels.join('')}</div>
     </section>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Book Barcodes</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 16px; color: #1f2937; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 8px 0 12px; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; display: flex; gap: 8px; align-items: center; }
  .toolbar b { font-size: 14px; }
  .toolbar button { background: #b45309; color: #fff; border: 0; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .group { border: 2px solid #e5e7eb; border-radius: 10px; margin: 0 0 14px; overflow: hidden; break-inside: avoid; }
  .ghead { padding: 6px 10px; font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
  .ghead .gid { font-weight: 600; font-size: 11px; opacity: 0.8; white-space: nowrap; }
  .labels { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; }
  .label { border: 2px solid #e5e7eb; border-radius: 8px; padding: 6px; width: 220px; text-align: center; background: #fff; break-inside: avoid; }
  .label .ltitle { font-size: 10px; font-weight: 600; height: 26px; overflow: hidden; line-height: 1.2; margin-bottom: 2px; }
  .label img { display: block; margin: 0 auto; max-width: 100%; }
  .label .lmeta { font-size: 9px; color: #6b7280; margin-top: 2px; }
  @media print {
    .toolbar { display: none; }
    body { margin: 0; }
    .group { border-color: #d1d5db; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <b>Book Barcodes</b>
    <span>${books.length} book${books.length === 1 ? '' : 's'} · ${totalLabels} label${totalLabels === 1 ? '' : 's'}</span>
    <button onclick="window.print()">Print</button>
  </div>
  ${groups || '<p>No barcodes to print.</p>'}
</body>
</html>`;
};

export const printBookBarcodes = (books: BarcodeBook[]): void => {
  const printable = books.filter((book) => book.bookId);
  if (printable.length === 0) return;

  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) {
    alert('Please allow pop-ups for this site to print barcodes.');
    return;
  }

  win.document.write(buildBarcodeSheetHtml(printable));
  win.document.close();
  win.focus();
};
