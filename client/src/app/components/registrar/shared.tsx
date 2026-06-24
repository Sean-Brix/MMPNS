import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all';
export const labelClass = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

// Compact pager: « Prev · page X of Y · Next » plus an item-range summary.
export const Pagination: React.FC<{
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}> = ({ page, pageCount, totalItems, pageSize, onChange }) => {
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">Showing {from}–{to} of {totalItems}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="px-2 text-xs font-medium text-gray-600">Page {page} of {pageCount}</span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export const Modal: React.FC<{
  open: boolean; onClose: () => void;
  children: React.ReactNode; maxW?: string;
}> = ({ open, onClose, children, maxW = 'max-w-lg' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className={`bg-white rounded-xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
