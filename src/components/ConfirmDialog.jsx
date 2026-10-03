import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'warning',
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] no-print flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl p-4 space-y-3"
      >
        <div className="flex items-start gap-2">
          <span
            className={`p-1.5 rounded-lg shrink-0 ${tone === 'warning' ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]'}`}
          >
            <AlertTriangle className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-semibold text-[var(--ui-text-primary)] flex-1">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancelLabel}
            className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">{message}</p>
        {detail && (
          <p className="text-[11px] text-[var(--ui-text-tertiary)] leading-relaxed border-l-2 border-[var(--ui-border-primary)] pl-2">
            {detail}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
