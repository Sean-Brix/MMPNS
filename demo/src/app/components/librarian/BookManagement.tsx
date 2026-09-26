import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookPlus, Upload, Barcode, Search, RefreshCw, Pencil, Trash2,
  X, Save, BookOpen, Printer,
} from 'lucide-react';
import { readDatabaseOnline, writeDatabase } from '../../../utils/database';
import { printBookBarcodes, generateBookId } from '../../../utils/bookBarcode';
import {
  newInternalBookId, parseCount, splitAccessions, type BookRecord,
} from '../../../utils/books';
import { Modal, inputClass, labelClass } from './shared';
import { ConfirmDialog } from '../common/BulkActions';
import { BulkBookImport } from './BulkBookImport';

interface BookFormValues {
  title: string; author: string; publisher: string; edition: string;
  copies: string; isbn: string; accessions: string; callNo: string;
}

const toFormValues = (book?: BookRecord): BookFormValues => ({
  title: book?.title ?? '',
  author: book?.author ?? '',
  publisher: book?.publisher ?? '',
  edition: book?.edition ?? '',
  copies: String(book?.copies ?? 1),
  isbn: book?.isbn ?? '',
  accessions: (book?.accessions ?? []).join(', '),
  callNo: book?.callNo ?? '',
});

// ─── Book form (shared by register + edit) ──────────────────────────────────────

const BookForm: React.FC<{
  initial?: BookRecord;
  submitLabel: string;
  onSubmit: (values: BookFormValues) => void;
  onCancel: () => void;
}> = ({ initial, submitLabel, onSubmit, onCancel }) => {
  const [form, setForm] = useState<BookFormValues>(() => toFormValues(initial));
  const [error, setError] = useState('');
  const set = (key: keyof BookFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
      <div className="p-5 space-y-4">
        <div>
          <label className={labelClass}>Title of the Book *</label>
          <input value={form.title} onChange={set('title')} className={inputClass} placeholder="e.g. English for High Schools" required />
        </div>
        <div>
          <label className={labelClass}>Author</label>
          <input value={form.author} onChange={set('author')} className={inputClass} placeholder="Surname, First name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Publisher</label>
            <input value={form.publisher} onChange={set('publisher')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Edition</label>
            <input value={form.edition} onChange={set('edition')} className={inputClass} placeholder="e.g. First" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>No. of Copies *</label>
            <input type="number" min="1" value={form.copies} onChange={set('copies')} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>ISBN</label>
            <input value={form.isbn} onChange={set('isbn')} className={`${inputClass} font-mono`} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Accession No(s).</label>
          <input value={form.accessions} onChange={set('accessions')} className={`${inputClass} font-mono`} placeholder="Comma-separated, one per copy — e.g. 10001, 10002" />
        </div>
        <div>
          <label className={labelClass}>Call No.</label>
          <input value={form.callNo} onChange={set('callNo')} className={`${inputClass} font-mono`} />
        </div>
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
          A unique barcode ID is generated automatically. Every copy shares that ID with a copy suffix —
          <span className="font-mono"> ID c1, ID c2 …</span>. List one accession number per copy (optional).
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{error}</div>}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors flex items-center justify-center gap-2">
          <Save size={14} />{submitLabel}
        </button>
      </div>
    </form>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────────

export const BookManagement: React.FC = () => {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [editBook, setEditBook] = useState<BookRecord | null>(null);
  const [deleteBook, setDeleteBook] = useState<BookRecord | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 4000); };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await readDatabaseOnline<{ books?: BookRecord[] }>('books');
      setBooks(Array.isArray(payload?.books) ? payload!.books : []);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const persist = useCallback((next: BookRecord[]) => {
    setBooks(next);
    writeDatabase('books', { books: next });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.publisher.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      b.accessions.some((a) => a.toLowerCase().includes(q)) ||
      b.bookId.includes(q),
    );
  }, [books, search]);

  const totalCopies = useMemo(() => books.reduce((sum, b) => sum + (b.copies || 0), 0), [books]);

  // Copies = the larger of the entered count and the number of accessions listed,
  // so the two fields can never contradict each other.
  const resolveCopies = (values: BookFormValues, accessions: string[]) =>
    Math.max(parseCount(values.copies), accessions.length);

  const handleCreate = (values: BookFormValues) => {
    const usedIds = new Set(books.map((b) => b.bookId));
    const accessions = splitAccessions(values.accessions);
    const record: BookRecord = {
      id: newInternalBookId(),
      bookId: generateBookId(usedIds),
      callNo: values.callNo.trim(),
      accessions,
      title: values.title.trim(),
      author: values.author.trim(),
      publisher: values.publisher.trim(),
      edition: values.edition.trim(),
      copies: resolveCopies(values, accessions),
      isbn: values.isbn.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([record, ...books]);
    setShowRegister(false);
    flash(`"${record.title}" registered with ID ${record.bookId} (${record.copies} cop${record.copies === 1 ? 'y' : 'ies'}).`);
  };

  const handleUpdate = (values: BookFormValues) => {
    if (!editBook) return;
    const accessions = splitAccessions(values.accessions);
    const next = books.map((b) => (b.id === editBook.id ? {
      ...b,
      callNo: values.callNo.trim(),
      accessions,
      title: values.title.trim(),
      author: values.author.trim(),
      publisher: values.publisher.trim(),
      edition: values.edition.trim(),
      copies: resolveCopies(values, accessions),
      isbn: values.isbn.trim(),
    } : b));
    persist(next);
    setEditBook(null);
    flash('Book updated.');
  };

  const handleDelete = () => {
    if (!deleteBook) return;
    persist(books.filter((b) => b.id !== deleteBook.id));
    setDeleteBook(null);
    flash('Book deleted.');
  };

  const onBulkImported = (nextBooks: BookRecord[]) => {
    persist(nextBooks);
    flash('Import complete.');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Books Catalog</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {books.length} title{books.length !== 1 ? 's' : ''} · {totalCopies} cop{totalCopies === 1 ? 'y' : 'ies'}. Barcode IDs are auto-generated.
          </p>
        </div>
        <button onClick={() => setShowBulkImport(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Upload size={15} />Bulk Import
        </button>
        <button onClick={() => printBookBarcodes(filtered)} disabled={filtered.length === 0}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <Barcode size={15} />Print Barcodes{search ? ` (${filtered.length})` : ''}
        </button>
        <button onClick={() => setShowRegister(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">
          <BookPlus size={15} />Register Book
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{actionMsg}</div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, ISBN, accession, ID..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
          </div>
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} shown</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading books...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{books.length === 0 ? 'No books registered yet.' : 'No books match your search.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Title / Author</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">ISBN</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Edition</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Barcode ID</th>
                  <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Copies</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{b.title}</p>
                      <p className="text-xs text-gray-400">{b.author || '—'}{b.publisher ? ` · ${b.publisher}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-gray-600">{b.isbn || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{b.edition || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">{b.bookId}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">{b.copies}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => printBookBarcodes([b])}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Print barcodes for this book">
                          <Printer size={14} />
                        </button>
                        <button onClick={() => setEditBook(b)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteBook(b)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register modal */}
      <Modal open={showRegister} onClose={() => setShowRegister(false)} maxW="max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Register Book</p>
            <p className="text-xs text-gray-400 mt-0.5">A barcode ID is generated automatically.</p>
          </div>
          <button onClick={() => setShowRegister(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <BookForm submitLabel="Register Book" onSubmit={handleCreate} onCancel={() => setShowRegister(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editBook} onClose={() => setEditBook(null)} maxW="max-w-xl">
        {editBook && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Edit Book</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">ID {editBook.bookId}</p>
              </div>
              <button onClick={() => setEditBook(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <BookForm initial={editBook} submitLabel="Save Changes" onSubmit={handleUpdate} onCancel={() => setEditBook(null)} />
          </>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteBook}
        title="Delete book"
        intent="danger"
        message={
          <>Permanently remove <span className="font-medium text-gray-700">{deleteBook?.title}</span> and its barcode ID? This cannot be undone.</>
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteBook(null)}
      />

      {/* Bulk import */}
      <BulkBookImport
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        existingBooks={books}
        onImported={onBulkImported}
      />
    </div>
  );
};
