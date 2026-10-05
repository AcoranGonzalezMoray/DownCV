import { useEffect, useMemo, useState } from 'react';
import { Copy, FileText, Printer, AlertTriangle, X, Briefcase } from 'lucide-react';
import {
  buildCoverLetter,
  coverLetterPlaceholders,
  coverLetterToPlainText,
} from '../utils/coverLetter';
import { downloadCoverLetterPdf, printCoverLetter } from '../utils/coverLetterExport';

export default function CoverLetterModal({
  open,
  onClose,
  onRequestExport,
  markdown,
  styles,
  t,
  lang,
  job = null,
}) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [signer, setSigner] = useState('');
  const [letter, setLetter] = useState('');
  const [generated, setGenerated] = useState('');
  const [notice, setNotice] = useState(null);

  const jobDescription = job?.jobDescription || '';
  const jobMatch = job?.jobMatch || null;

  useEffect(() => {
    if (!open) {
      setRole('');
      setCompany('');
      setSigner('');
      setLetter('');
      setGenerated('');
      setNotice(null);
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

  const placeholders = useMemo(() => coverLetterPlaceholders(letter), [letter]);

  if (!open) {
    return null;
  }

  const field =
    'app-input w-full text-xs p-1.5 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]';
  const button =
    'px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)] disabled:opacity-40';

  const generate = () => {
    const { markdown: text } = buildCoverLetter(markdown, {
      lang,
      role,
      company,
      name: signer,
      jobDescription,
      match: jobMatch,
    });
    setLetter(text);
    setGenerated(text);
  };

  const print = () => {
    onRequestExport(() => {
      if (!printCoverLetter(letter, styles)) {
        setNotice({ tone: 'amber', text: t.letterPopupBlocked });
      }
    });
  };

  const download = () => {
    onRequestExport(() => {
      const name = [signer, 'Cover_Letter'].filter(Boolean).join('_').replace(/\s+/g, '_');
      downloadCoverLetterPdf(letter, styles, `${name}.pdf`);
      setNotice({ tone: 'emerald', text: t.letterPdfDone });
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coverLetterToPlainText(letter));
      setNotice({ tone: 'emerald', text: t.letterCopied });
    } catch {
      setNotice({ tone: 'red', text: t.letterCopyFailed });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] no-print flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.letterTitle}
        className="relative w-full max-w-2xl rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start gap-2">
          <span className="p-1.5 rounded-lg shrink-0 bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <FileText className="w-4 h-4" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">{t.letterTitle}</h2>
            <p className="text-[11px] text-[var(--ui-text-tertiary)] leading-relaxed">
              {t.letterIntro}
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

        {jobDescription && (
          <p className="flex items-start gap-2 rounded-lg border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--ui-accent)]">
            <Briefcase className="mt-px w-3.5 h-3.5 shrink-0" />
            <span>{t.letterFromJob}</span>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">
              {t.letterRole}
            </span>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Frontend Engineer"
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">
              {t.letterCompany}
            </span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Globex"
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">
              {t.letterSigner}
            </span>
            <input
              value={signer}
              onChange={(event) => setSigner(event.target.value)}
              placeholder={t.letterSignerHint}
              className={field}
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generate}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] transition"
          >
            {t.letterGenerate}
          </button>
          {letter !== generated && letter && (
            <button type="button" onClick={() => setLetter(generated)} className={button}>
              {t.letterReset}
            </button>
          )}
          <span className="text-[10px] text-[var(--ui-text-muted)] ml-auto">{t.letterFromCv}</span>
        </div>

        {letter && placeholders.length > 0 && (
          <p className="text-[11px] text-amber-400 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
            <span>{t.letterPlaceholders.replace('{n}', placeholders.length)}</span>
          </p>
        )}

        {notice && (
          <p
            className={`text-[11px] ${notice.tone === 'emerald' ? 'text-emerald-400' : notice.tone === 'red' ? 'text-red-400' : 'text-amber-400'}`}
          >
            {notice.text}
          </p>
        )}

        {letter ? (
          <textarea
            value={letter}
            onChange={(event) => setLetter(event.target.value)}
            rows={12}
            spellCheck={false}
            aria-label={t.letterTitle}
            className="app-input w-full text-[11px] font-mono leading-relaxed p-2 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] text-[var(--ui-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]"
          />
        ) : (
          <p className="text-[11px] text-[var(--ui-text-tertiary)] rounded border border-dashed border-[var(--ui-border-primary)] p-4 text-center">
            {t.letterEmpty}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={copy} disabled={!letter} className={button}>
            <Copy className="w-3.5 h-3.5 inline" /> {t.letterCopy}
          </button>
          <button type="button" onClick={print} disabled={!letter} className={button}>
            <Printer className="w-3.5 h-3.5 inline" /> {t.letterPrint}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!letter}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] text-[var(--ui-text-inverse)] transition disabled:opacity-40"
          >
            {t.letterPdf}
          </button>
        </div>
      </div>
    </div>
  );
}
