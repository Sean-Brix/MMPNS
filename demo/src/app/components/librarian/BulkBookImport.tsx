import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle,
  ArrowRight, RotateCcw, Layers,
} from 'lucide-react';
import { Modal } from './shared';
import { parseCsv } from '../../../utils/csv';
import { parseXlsx, rowsToObjects } from '../../../utils/xlsx';
import {
  BOOK_HEADER_MAP, mergeBookImport, normalizeBookKey,
  type BookImportRow, type BookImportOutcome, type BookRecord,
} from '../../../utils/books';

type Stage = 'pick' | 'preview' | 'summary';

interface BulkBookImportProps {
  open: boolean;
  onClose: () => void;
  existingBooks: BookRecord[];
  onImported: (nextBooks: BookRecord[]) => void;
}

export const BulkBookImport: React.FC<BulkBookImportProps> = ({
  open, onClose, existingBooks, onImported,
}) => {
  const [stage, setStage] = useState<Stage>('pick');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<BookImportRow[]>([]);
  const [outcome, setOutcome] = useState<BookImportOutcome | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('pick');
    setFileName('');
    setParseError('');
    setRows([]);
    setOutcome(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);
    try {
      let objects: Record<string, string>[];
      if (/\.xlsx$/i.test(file.name)) {
        objects = rowsToObjects(await parseXlsx(await file.arrayBuffer()), BOOK_HEADER_MAP);
      } else {
        objects = rowsToObjects(parseCsv(await file.text()), BOOK_HEADER_MAP);
      }

      const usable = (objects as BookImportRow[]).filter((r) => (r.title || '').trim());
      if (usable.length === 0) {
        setParseError('No usable book rows were found. Make sure the first row is a header with a "Title of the Book" column.');
        return;
      }
      setRows(usable);
      setStage('preview');
    } catch (err: any) {
      setParseError(err?.message || 'Could not read this file.');
    }
  };

  const runImport = () => {
    const result = mergeBookImport(existingBooks, rows);
    setOutcome(result);
    onImported(result.nextBooks);
    setStage('summary');
  };

  const distinctTitles = new Set(rows.map((r) => normalizeBookKey((r.title || '').trim()))).size;

  return (
    <Modal open={open} onClose={handleClose} maxW="max-w-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">Bulk Book Import</p>
          <p className="text-xs text-gray-400 mt-0.5">Upload an Excel (.xlsx) or CSV file to register many books at once.</p>
        </div>
        <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {stage === 'pick' && (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-colors"
              >
                <Upload size={28} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-700">Click to choose an .xlsx or .csv file, or drag it here</p>
                <p className="text-xs text-gray-400 text-center">
                  Expected columns: Call No., Accession, Title of the Book, Author, Publisher, Edition, Copy, ISBN.
                  Rows that share a title are grouped as copies of one book.
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
              {parseError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />{parseError}
                </div>
              )}
            </motion.div>
          )}

          {stage === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet size={16} className="text-amber-600" />
                <p className="text-sm font-medium text-gray-900">{fileName}</p>
              </div>
              <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                <Layers size={14} className="flex-shrink-0" />
                <span>
                  <b>{rows.length}</b> row{rows.length !== 1 ? 's' : ''} → <b>{distinctTitles}</b> distinct book{distinctTitles !== 1 ? 's' : ''}.
                  Rows with the same title share one barcode ID; each copy gets <span className="font-mono">c1, c2…</span>
                </span>
              </div>
              <div className="border border-gray-100 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Title</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Author</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Accession</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 200).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{row.title || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.author || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{row.accession || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 200 && <p className="text-[11px] text-gray-400 mt-2">Showing first 200 of {rows.length} rows.</p>}
            </motion.div>
          )}

          {stage === 'summary' && outcome && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">{outcome.newTitles}</p>
                  <p className="text-[11px] text-green-600">New books</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-700">{outcome.copiesAdded}</p>
                  <p className="text-[11px] text-blue-600">Copies added</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-700">{outcome.duplicates}</p>
                  <p className="text-[11px] text-amber-600">Duplicate</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-red-700">{outcome.failed}</p>
                  <p className="text-[11px] text-red-600">Failed</p>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {outcome.rows.map((r) => (
                  <div key={r.rowNumber}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${
                      r.status === 'added-new' ? 'bg-green-50 text-green-700'
                        : r.status === 'added-copy' ? 'bg-blue-50 text-blue-700'
                        : r.status === 'duplicate' ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {(r.status === 'added-new' || r.status === 'added-copy') && <CheckCircle2 size={13} className="flex-shrink-0" />}
                      {r.status === 'duplicate' && <AlertCircle size={13} className="flex-shrink-0" />}
                      {r.status === 'failed' && <XCircle size={13} className="flex-shrink-0" />}
                      <span className="font-medium truncate">{r.title}</span>
                      {r.accession && <span className="text-[10px] font-mono opacity-60">#{r.accession}</span>}
                    </div>
                    <span className="text-[11px] opacity-75 flex-shrink-0">
                      {r.status === 'added-new' ? 'new book'
                        : r.status === 'added-copy' ? 'copy added'
                        : r.message}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        {stage === 'pick' && (
          <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
            Cancel
          </button>
        )}
        {stage === 'preview' && (
          <>
            <button onClick={reset} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
              Choose Different File
            </button>
            <button onClick={runImport}
              className="flex-1 px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors flex items-center justify-center gap-2">
              Import {rows.length} Row{rows.length !== 1 ? 's' : ''}<ArrowRight size={14} />
            </button>
          </>
        )}
        {stage === 'summary' && (
          <>
            <button onClick={reset} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors flex items-center justify-center gap-2">
              <RotateCcw size={14} />Import Another File
            </button>
            <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors">
              Done
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
