import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react';

export default function AiRewritePopover({
  anchor,
  original,
  options,
  loading,
  error,
  t,
  onPick,
  onGenerate,
  onClose,
}) {
  const [position, setPosition] = useState(null);
  const dragRef = useRef(null);
  const shown = position || anchor;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest?.('button')) {
      return;
    }
    dragRef.current = {
      id: event.pointerId,
      dx: event.clientX - shown.left,
      dy: event.clientY - shown.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) {
      return;
    }
    event.preventDefault();
    setPosition({
      left: Math.min(Math.max(8, event.clientX - drag.dx), Math.max(8, window.innerWidth - 120)),
      top: Math.min(Math.max(8, event.clientY - drag.dy), Math.max(8, window.innerHeight - 60)),
    });
  };

  const endDrag = (event) => {
    if (dragRef.current?.id === event.pointerId) {
      dragRef.current = null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t.aiRewriteTitle}
      style={{ top: shown.top, left: shown.left }}
      className="no-print fixed z-[110] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl overflow-hidden"
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title={t.aiRewriteTitle}
        className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-[var(--ui-accent)] pointer-events-none" />
        <h3 className="flex-1 truncate text-xs font-semibold text-[var(--ui-text-primary)] pointer-events-none">
          {t.aiRewriteTitle}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.cancel}
          className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[min(50vh,360px)] overflow-y-auto p-2 space-y-1.5">
        <p className="px-1 text-[10px] leading-relaxed text-[var(--ui-text-tertiary)]">
          <span className="font-semibold text-[var(--ui-text-secondary)]">
            {t.aiRewriteOriginal}:{' '}
          </span>
          {original}
        </p>

        {options.map((option, index) => (
          <button
            key={`${index}-${option.slice(0, 24)}`}
            type="button"
            onClick={() => onPick(option)}
            title={t.aiRewriteUse}
            className="group flex w-full items-start justify-between gap-2 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-2.5 py-2 text-left text-[11px] leading-relaxed text-[var(--ui-text-primary)] transition hover:border-[var(--ui-accent)]/60 hover:bg-[var(--ui-accent-muted)]"
          >
            <span className="min-w-0 flex-1">{option}</span>
            <ArrowRight className="mt-0.5 w-3.5 h-3.5 shrink-0 text-[var(--ui-text-muted)] transition group-hover:translate-x-px group-hover:text-[var(--ui-accent)]" />
          </button>
        ))}

        {options.length === 0 && !loading && (
          <p className="px-1 py-2 text-center text-[11px] text-[var(--ui-text-tertiary)]">
            {t.aiRewriteEmpty}
          </p>
        )}

        {error && <p className="px-1 text-[11px] text-red-400">{error}</p>}
      </div>

      <div className="border-t border-[var(--ui-border-primary)] px-2 py-1.5">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent-muted)] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.aiRewriteGenerating}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> {t.aiRewriteGenerate}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
