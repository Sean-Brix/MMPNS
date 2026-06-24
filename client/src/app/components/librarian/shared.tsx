import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all';
export const labelClass = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

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
