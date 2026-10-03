import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight, MapPinned } from 'lucide-react';
import { placePopover } from '../utils/popoverPlacement';

export function buildTourSteps(t) {
  return [
    { id: 'welcome', target: null, title: t.tourWelcomeTitle, body: t.tourWelcomeBody },
    {
      id: 'editor',
      target: '[data-tour="editor"]',
      title: t.tourEditorTitle,
      body: t.tourEditorBody,
    },
    {
      id: 'preview',
      target: '[data-tour="preview"]',
      title: t.tourPreviewTitle,
      body: t.tourPreviewBody,
    },
    {
      id: 'sidebar',
      target: '[data-tour="sidebar"]',
      title: t.tourSidebarTitle,
      body: t.tourSidebarBody,
    },
    { id: 'ai', target: '[data-tour="ai"]', title: t.tourAiTitle, body: t.tourAiBody },
    {
      id: 'export',
      target: '[data-tour="export"]',
      title: t.tourExportTitle,
      body: t.tourExportBody,
    },
    {
      id: 'palette',
      target: '[data-tour="palette"]',
      title: t.tourPaletteTitle,
      body: t.tourPaletteBody,
    },
  ];
}

export default function AppTour({ open, t, onDone }) {
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState(null);
  const steps = useMemo(() => buildTourSteps(t), [t]);

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    let current = index;
    while (
      current < steps.length &&
      steps[current].target &&
      !document.querySelector(steps[current].target)
    ) {
      current += 1;
    }
    if (current >= steps.length) {
      onDone();
      return undefined;
    }
    if (current !== index) {
      setIndex(current);
      return undefined;
    }
    const measure = () => {
      const element = steps[current].target ? document.querySelector(steps[current].target) : null;
      const rect = element?.getBoundingClientRect?.();
      setFrame(
        rect && rect.width + rect.height > 0
          ? {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              bottom: rect.bottom,
              right: rect.right,
            }
          : null,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      document.removeEventListener('scroll', measure, true);
    };
  }, [open, index, steps, onDone]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onDone();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDone]);

  if (!open) {
    return null;
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const card = frame
    ? placePopover({
        rect: frame,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        popoverWidth: 440,
      })
    : {
        top: Math.max(8, window.innerHeight / 2 - 160),
        left: Math.max(8, window.innerWidth / 2 - 220),
      };

  return (
    <div className="no-print fixed inset-0 z-[130]">
      <div className="absolute inset-0 bg-black/60" onClick={onDone} aria-hidden="true" />
      {frame && (
        <div
          aria-hidden="true"
          style={{
            top: frame.top - 6,
            left: frame.left - 6,
            width: frame.width + 12,
            height: frame.height + 12,
          }}
          className="pointer-events-none absolute rounded-xl border-2 border-[var(--ui-accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.15),0_0_24px_var(--ui-accent-muted)] transition-all duration-300"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={{ top: card.top, left: card.left }}
        className="fixed z-[131] w-[440px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)]">
          <MapPinned className="w-4 h-4 shrink-0 text-[var(--ui-accent)]" />
          <h3 className="flex-1 truncate text-sm font-semibold text-[var(--ui-text-primary)]">
            {step.title}
          </h3>
          <span className="shrink-0 font-mono text-[11px] text-[var(--ui-text-muted)]">
            {index + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={onDone}
            aria-label={t.cancel}
            className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="px-4 py-3.5 text-[13px] leading-relaxed text-[var(--ui-text-secondary)]">
          {step.body}
        </p>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--ui-border-primary)] px-3 py-2">
          <button
            type="button"
            onClick={onDone}
            className="px-3 py-2 rounded-lg text-xs font-medium text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
          >
            {t.tourSkip}
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {t.tourBack}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (last) {
                  onDone();
                } else {
                  setIndex((value) => value + 1);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] transition"
            >
              {last ? t.tourFinish : t.tourNext} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
