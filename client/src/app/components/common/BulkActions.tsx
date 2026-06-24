import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

// ─── Row selection hook ─────────────────────────────────────────────────────────
// Generic, style-free selection state shared by every bulk-editable table.
// Ids are composite strings (e.g. a uid, or `${accountType}-${id}`) so the same
// hook works for cloud tables and the local-DB developer table.

export function useRowSelection<Id extends string | number = string>() {
  const [ids, setIds] = useState<Set<Id>>(() => new Set());

  const isSelected = useCallback((id: Id) => ids.has(id), [ids]);

  const toggle = useCallback((id: Id) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((list: Id[], checked: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      list.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const clear = useCallback(() => setIds(new Set()), []);

  // Drop any selected ids that are no longer present (after refresh / filtering /
  // deletion) so bulk actions never target stale rows.
  const retain = useCallback((available: Id[]) => {
    const allow = new Set(available);
    setIds((prev) => {
      let changed = false;
      const next = new Set<Id>();
      prev.forEach((id) => {
        if (allow.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, []);

  const selected = useMemo(() => Array.from(ids), [ids]);

  return { selected, count: ids.size, isSelected, toggle, setMany, clear, retain };
}

// ─── Checkbox ───────────────────────────────────────────────────────────────────

export const SelectCheckbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
}> = ({ checked, onChange, disabled, indeterminate, className = '', title, ariaLabel }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={`w-4 h-4 rounded border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
    />
  );
};

// ─── One field inside a bulk-edit form ──────────────────────────────────────────
// Each field has an enable toggle. Only enabled fields are written, so a blank
// field is never accidentally applied to every selected row.

export const BulkEditField: React.FC<{
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
  hint?: string;
  accentClass?: string;
}> = ({ label, enabled, onToggle, children, hint, accentClass = '' }) => (
  <div className={`rounded-lg border p-3 transition-colors ${enabled ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'}`}>
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className={`w-4 h-4 rounded ${accentClass}`}
      />
      <span className="text-xs font-semibold text-gray-700">{label}</span>
    </label>
    <div className={`mt-2 transition-opacity ${enabled ? '' : 'opacity-40 pointer-events-none'}`}>
      {children}
    </div>
    {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

// ─── Confirmation dialog ────────────────────────────────────────────────────────
// Neutral styling so it reads well in both the purple registrar portal and the
// green developer dashboard.

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  intent = 'primary', busy = false, onConfirm, onCancel,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 p-5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              intent === 'danger' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="p-1 -m-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-gray-500 mt-1">{message}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${
                intent === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Helpers ────────────────────────────────────────────────────────────────────

export interface BulkResult {
  ok: number;
  failed: number;
  errors: string[];
}

// Run an async action over many ids, tallying successes and failures so one bad
// row never aborts the whole batch.
export async function runBulk<Id>(
  ids: Id[],
  action: (id: Id) => Promise<unknown>,
): Promise<BulkResult> {
  const outcomes = await Promise.allSettled(ids.map((id) => action(id)));
  const errors: string[] = [];
  let ok = 0;
  let failed = 0;
  outcomes.forEach((outcome) => {
    if (outcome.status === 'fulfilled') {
      ok += 1;
    } else {
      failed += 1;
      const reason = outcome.reason;
      errors.push(reason?.message || String(reason));
    }
  });
  return { ok, failed, errors };
}

export const summarizeBulk = (verb: string, result: BulkResult): string => {
  if (result.failed === 0) return `${verb} ${result.ok} account${result.ok === 1 ? '' : 's'}.`;
  if (result.ok === 0) return `Failed to ${verb.toLowerCase()} ${result.failed} account${result.failed === 1 ? '' : 's'}. ${result.errors[0] || ''}`.trim();
  return `${verb} ${result.ok}, ${result.failed} failed. ${result.errors[0] || ''}`.trim();
};
