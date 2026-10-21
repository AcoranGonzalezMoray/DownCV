import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function MobilePanel({ open, title, closeLabel, onClose, children }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="mobile-overlay fixed inset-0 z-[70] no-print"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        tabIndex={-1}
        className="mobile-backdrop absolute inset-0 h-full w-full cursor-default border-0 bg-black/55"
      />
      <aside className="mobile-sheet absolute inset-y-0 right-0 flex w-[min(24rem,92vw)] flex-col border-l border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--ui-border-primary)] px-3">
          <h2 className="truncate text-sm font-semibold text-[var(--ui-text-primary)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </aside>
    </div>
  );
}
