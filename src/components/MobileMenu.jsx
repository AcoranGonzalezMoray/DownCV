import { useEffect } from 'react';
import {
  Bell,
  Command,
  FileText,
  FileUp,
  GitBranch,
  Globe,
  Info,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import ExportMenu from './ExportMenu';

function Row({ icon: Icon, label, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-3 py-2 text-left text-sm font-medium text-[var(--ui-text-primary)] transition hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--ui-accent)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-1.5">
      {title && (
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)]">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}

export default function MobileMenu({
  open,
  onClose,
  t,
  lang,
  onLang,
  theme,
  onToggleTheme,
  onOpenPanel,
  onCommandPalette,
  onAi,
  onImport,
  onLetter,
  onAbout,
  onUpdate,
  latestAts,
  variantIsDirty,
  exports,
}) {
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

  const run = (action) => () => {
    onClose();
    action();
  };

  const atsBadge = latestAts ? (
    <span
      className={`shrink-0 rounded px-1.5 font-mono text-[10px] ${
        latestAts.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
      }`}
    >
      {latestAts.score}%
    </span>
  ) : null;

  return (
    <div
      className="mobile-overlay fixed inset-0 z-[70] no-print"
      role="dialog"
      aria-modal="true"
      aria-label={t.mobileMenuTitle}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t.mobileClose}
        tabIndex={-1}
        className="mobile-backdrop absolute inset-0 h-full w-full cursor-default border-0 bg-black/55"
      />
      <aside className="mobile-sheet absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col border-l border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--ui-border-primary)] px-3">
          <h2 className="truncate text-sm font-semibold text-[var(--ui-text-primary)]">
            {t.mobileMenuTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.mobileClose}
            title={t.mobileClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
          <Section title={t.mobileTools}>
            <Row icon={Palette} label={t.stylesTab} onClick={run(() => onOpenPanel('styles'))} />
            <Row
              icon={ShieldCheck}
              label={t.atsScoreTab}
              badge={atsBadge}
              onClick={run(() => onOpenPanel('ats'))}
            />
            <Row
              icon={GitBranch}
              label={t.variantsTab}
              badge={
                variantIsDirty ? (
                  <span className="shrink-0 rounded bg-amber-950 px-1.5 font-mono text-[10px] text-amber-400">
                    *
                  </span>
                ) : null
              }
              onClick={run(() => onOpenPanel('variants'))}
            />
          </Section>

          <Section title={t.mobileMenuTitle}>
            <Row icon={Command} label={t.cmdTitle} onClick={run(onCommandPalette)} />
            <Row icon={Sparkles} label={t.aiAssistantTitle} onClick={run(onAi)} />
            <Row icon={FileUp} label={t.importTitle} onClick={run(onImport)} />
            <Row icon={FileText} label={t.letterTitle} onClick={run(onLetter)} />
            {onUpdate && <Row icon={Bell} label={t.mobileUpdate} onClick={run(onUpdate)} />}
            <Row icon={Info} label={t.aboutTitle} onClick={run(onAbout)} />
          </Section>

          <Section title={t.exportLabel}>
            <ExportMenu
              inline
              t={t}
              onPdf={exports.onPdf}
              onDocx={exports.onDocx}
              onRtf={exports.onRtf}
              onPng={exports.onPng}
              onJson={exports.onJson}
              onPortfolio={exports.onPortfolio}
              onAfterRun={onClose}
            />
          </Section>

          <Section title={t.mobileLanguage}>
            <div className="flex items-center gap-1 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-1">
              {['en', 'es'].map((code) => {
                const isActive = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onLang(code)}
                    aria-pressed={isActive}
                    title={t[`lang${code.toUpperCase()}`]}
                    className={`flex min-h-9 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)]'
                        : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {code.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t.mobileTheme}>
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-3 py-2 text-left text-sm font-medium text-[var(--ui-text-primary)] transition hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 shrink-0 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 shrink-0 text-indigo-400" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {theme === 'dark' ? t.mobileThemeLight : t.mobileThemeDark}
              </span>
            </button>
          </Section>
        </div>
      </aside>
    </div>
  );
}
