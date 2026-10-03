import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Printer,
  XCircle,
  Image,
  Code,
  Globe,
} from 'lucide-react';

export default function ExportMenu({ t, onPdf, onDocx, onRtf, onJson, onPng, onPortfolio }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = async (kind, action) => {
    setBusy(kind);
    setError(null);
    try {
      const done = await action();
      if (done === false) {
        setOpen(false);
        return;
      }
      setOpen(false);
    } catch (e) {
      setError(e?.message || t.exportError);
    } finally {
      setBusy(null);
    }
  };

  const items = [
    { kind: 'pdf', label: t.exportPdf, hint: t.exportPdfHint, icon: Printer, action: onPdf },
    { kind: 'docx', label: t.exportDocx, hint: t.exportDocxHint, icon: FileText, action: onDocx },
    { kind: 'rtf', label: t.exportRtf, hint: t.exportRtfHint, icon: FileText, action: onRtf },
  ];

  if (onPng) {
    items.push({
      kind: 'png',
      label: t.exportPng || 'Image (.png)',
      hint: t.exportPngHint || 'High-res image of the page',
      icon: Image,
      action: onPng,
    });
  }
  if (onJson) {
    items.push({
      kind: 'json',
      label: t.exportJson || 'JSON Resume (.json)',
      hint: t.exportJsonHint || 'Standard portable schema format (jsonresume.org).',
      icon: Code,
      action: onJson,
    });
  }
  if (onPortfolio) {
    items.push({
      kind: 'portfolio',
      label: t.exportPortfolio,
      hint: t.exportPortfolioHint,
      icon: Globe,
      action: onPortfolio,
    });
  }

  return (
    <div className="relative no-print" data-tour="export" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.exportLabel}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] font-medium text-xs rounded-lg shadow transition whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 shrink-0" /> {t.exportLabel}{' '}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.exportLabel}
          className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-xl p-1.5 space-y-0.5"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.kind}
                type="button"
                role="menuitem"
                disabled={busy !== null}
                onClick={() => run(item.kind, item.action)}
                className="w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-[var(--ui-accent-muted)] disabled:opacity-60"
              >
                <span className="mt-0.5 text-[var(--ui-accent)]">
                  {busy === item.kind ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-[var(--ui-text-primary)]">
                    {item.label}
                  </span>
                  <span className="block text-[10px] text-[var(--ui-text-tertiary)] leading-snug">
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
          {error && (
            <p className="flex items-start gap-1.5 px-2 py-1.5 text-[10px] text-red-400 border-t border-[var(--ui-border-primary)] mt-1 pt-2">
              <XCircle className="w-3 h-3 mt-px shrink-0" /> {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
