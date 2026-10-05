import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload, X } from 'lucide-react';
import { IMPORT_EXTENSIONS, readImportFile } from '../utils/importFiles';
import { textToMarkdown } from '../utils/cvImport';

export default function ImportModal({ open, onClose, onImport, t, lang, isUnsaved }) {
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setRaw('');
      setResult(null);
      setStatus('idle');
      setError(null);
    }
  }, [open]);

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

  const fail = (reason) => {
    setStatus('error');
    setError(
      t[`importError${reason.charAt(0).toUpperCase()}${reason.slice(1)}`] || t.importErrorGeneric,
    );
  };

  const convert = (text, kind) => {
    const parsed = textToMarkdown(text, { lang });
    setResult({ ...parsed, kind });
    setStatus('idle');
    setError(null);
  };

  const takeFile = async (file) => {
    if (!file) {
      return;
    }
    setStatus('reading');
    setError(null);
    try {
      const { text, kind } = await readImportFile(file);
      setRaw(text);
      if (!text.trim()) {
        fail('empty');
        return;
      }
      convert(text, kind);
    } catch (e) {
      fail(e?.reason || 'generic');
    }
  };

  const confirm = () => {
    if (!result) {
      return;
    }
    onImport(result.markdown);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] no-print flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.importTitle}
        className="relative w-full max-w-2xl rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start gap-2">
          <span className="p-1.5 rounded-lg shrink-0 bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <FileUp className="w-4 h-4" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">{t.importTitle}</h2>
            <p className="text-[11px] text-[var(--ui-text-tertiary)] leading-relaxed">
              {t.importIntro}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            takeFile(event.dataTransfer.files?.[0]);
          }}
          className={`rounded-lg border-2 border-dashed p-4 text-center space-y-2 transition ${
            dragOver
              ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-muted)]'
              : 'border-[var(--ui-border-primary)]'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto text-[var(--ui-text-tertiary)]" />
          <p className="text-xs text-[var(--ui-text-secondary)]">{t.importDrop}</p>
          <p className="text-[10px] font-mono text-[var(--ui-text-muted)]">PDF · DOCX · TXT · MD</p>
          <input
            ref={inputRef}
            type="file"
            accept={IMPORT_EXTENSIONS.join(',')}
            className="hidden"
            onChange={(event) => takeFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === 'reading'}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)] disabled:opacity-60"
          >
            {status === 'reading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> {t.importReading}
              </>
            ) : (
              t.importChooseFile
            )}
          </button>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]">
            {t.importPaste}
          </summary>
          <textarea
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value);
              setResult(null);
            }}
            placeholder={t.importPlaceholder}
            rows={6}
            className="app-input mt-2 w-full text-[11px] font-mono p-2 rounded border border-[var(--ui-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]"
          />
          <button
            type="button"
            onClick={() => convert(raw, 'text')}
            disabled={!raw.trim()}
            className="mt-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 disabled:opacity-40"
          >
            {t.importConvert}
          </button>
        </details>

        {status === 'error' && (
          <p className="text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {error}
          </p>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {result.name ? (
                <span className="font-medium">{result.name}</span>
              ) : (
                <span>{t.importNoName}</span>
              )}
              {result.contact.email && (
                <span className="text-[var(--ui-text-tertiary)] font-mono">
                  {result.contact.email}
                </span>
              )}
            </div>

            {result.sections.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {result.sections.map((section) => (
                  <li
                    key={section.key}
                    className="px-2 py-0.5 rounded bg-[var(--ui-bg-badge)] border border-[var(--ui-border-primary)] text-[10px] font-mono text-[var(--ui-text-secondary)]"
                  >
                    {section.title} · {section.lines}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-amber-400">{t.importNoSections}</p>
            )}

            {result.warnings.includes('noEmail') && (
              <p className="text-[11px] text-amber-400">{t.importNoEmail}</p>
            )}

            <pre className="max-h-40 overflow-auto text-[10px] font-mono leading-relaxed whitespace-pre-wrap rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2 text-[var(--ui-text-secondary)]">
              {result.markdown}
            </pre>

            {isUnsaved && <p className="text-[11px] text-amber-400">{t.importReplacesUnsaved}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!result}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] transition disabled:opacity-40"
          >
            {t.importConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
