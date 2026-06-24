// Shared book catalog types + helpers used by the librarian book pages.

import { generateBookId } from './bookBarcode';

export interface BookRecord {
  id: string;          // internal record id (for edit/delete)
  bookId: string;      // 8-digit barcode base, shared by all copies of this book
  title: string;
  author: string;
  publisher: string;
  edition: string;
  isbn: string;
  callNo: string;
  copies: number;      // number of physical copies
  accessions: string[]; // per-copy accession numbers (copy n -> accessions[n-1])
  createdAt: string;
}

export const BOOKS_TABLE = 'books' as const;

// Maps spreadsheet/CSV header text (trimmed + lowercased) to import-row keys.
// Matches the "Books for testing.xlsx" layout, with a few common aliases.
export const BOOK_HEADER_MAP: Record<string, string> = {
  'call no.': 'callNo',
  'call no': 'callNo',
  'call number': 'callNo',
  'accession': 'accession',
  'accession no': 'accession',
  'accession no.': 'accession',
  'accession number': 'accession',
  'title of the book': 'title',
  'title': 'title',
  'book title': 'title',
  'author': 'author',
  'publisher': 'publisher',
  'edition': 'edition',
  'copy': 'copy',
  'isbn': 'isbn',
};

export const newInternalBookId = (): string =>
  `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Identity key for "the same book". Copies of one book are rows that share this
// key — by default the normalized title.
export const normalizeBookKey = (title: string): string =>
  title.trim().toLowerCase().replace(/\s+/g, ' ');

export const parseCount = (value: unknown, fallback = 1): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Splits a comma/newline separated list of accession numbers.
export const splitAccessions = (value: string): string[] =>
  value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

// ─── Bulk import / merge ────────────────────────────────────────────────────────

export interface BookImportRow {
  callNo?: string; accession?: string; title?: string; author?: string;
  publisher?: string; edition?: string; copy?: string; isbn?: string;
}

export type ImportRowStatus = 'added-new' | 'added-copy' | 'duplicate' | 'failed';

export interface ImportRowResult {
  title: string;
  accession: string;
  rowNumber: number;
  status: ImportRowStatus;
  message?: string;
}

export interface BookImportOutcome {
  nextBooks: BookRecord[];
  newTitles: number;
  copiesAdded: number;
  duplicates: number;
  failed: number;
  rows: ImportRowResult[];
}

// Merges spreadsheet rows into the existing catalog. Rows that share a title are
// grouped into one book (one shared barcode ID); each row becomes one physical
// copy. Re-importing rows whose accession already exists is skipped as duplicate.
export const mergeBookImport = (
  existing: BookRecord[],
  rows: BookImportRow[],
): BookImportOutcome => {
  const next: BookRecord[] = existing.map((b) => ({ ...b, accessions: [...b.accessions] }));
  const byKey = new Map<string, BookRecord>();
  next.forEach((b) => byKey.set(normalizeBookKey(b.title), b));

  const usedIds = new Set(next.map((b) => b.bookId));
  const usedAccessions = new Set<string>();
  next.forEach((b) => b.accessions.forEach((a) => usedAccessions.add(a.toLowerCase())));

  const results: ImportRowResult[] = [];
  let newTitles = 0;
  let copiesAdded = 0;
  let duplicates = 0;
  let failed = 0;

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 header, +1 to 1-based
    const title = (row.title || '').trim();
    const accession = (row.accession || '').trim();

    if (!title) {
      failed += 1;
      results.push({ title: '(untitled)', accession, rowNumber, status: 'failed', message: 'Missing title.' });
      return;
    }

    if (accession && usedAccessions.has(accession.toLowerCase())) {
      duplicates += 1;
      results.push({ title, accession, rowNumber, status: 'duplicate', message: `Accession ${accession} already exists.` });
      return;
    }

    const key = normalizeBookKey(title);
    let book = byKey.get(key);
    const isNewTitle = !book;

    if (!book) {
      book = {
        id: newInternalBookId(),
        bookId: generateBookId(usedIds),
        title,
        author: (row.author || '').trim(),
        publisher: (row.publisher || '').trim(),
        edition: (row.edition || '').trim(),
        isbn: (row.isbn || '').trim(),
        callNo: (row.callNo || '').trim(),
        copies: 0,
        accessions: [],
        createdAt: new Date().toISOString(),
      };
      usedIds.add(book.bookId);
      byKey.set(key, book);
      next.push(book);
      newTitles += 1;
    }

    book.copies += 1;
    copiesAdded += 1;
    if (accession) {
      book.accessions.push(accession);
      usedAccessions.add(accession.toLowerCase());
    }

    results.push({ title, accession, rowNumber, status: isNewTitle ? 'added-new' : 'added-copy' });
  });

  return { nextBooks: next, newTitles, copiesAdded, duplicates, failed, rows: results };
};
