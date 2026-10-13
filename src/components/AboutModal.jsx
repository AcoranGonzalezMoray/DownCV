import { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ExternalLink,
  EyeOff,
  Github,
  HardDrive,
  Info,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { REPO_URL } from '../data/versionInfo';
import { isDemoEnvironment, runningSha } from '../utils/versionCheck';

export default function AboutModal({
  open,
  onClose,
  t,
  isDemo = isDemoEnvironment(),
  repoUrl = REPO_URL,
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

  const sha = runningSha();
  const iconUrl = `${import.meta.env.BASE_URL}icon.jpg`;

  return (
    <div
      className="fixed inset-0 z-[100] no-print flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] shadow-xs">
              <img src={iconUrl} alt="DownCV" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="about-modal-title"
                  className="text-sm font-bold tracking-tight text-[var(--ui-text-primary)]"
                >
                  DownCV
                </h2>
                {sha && (
                  <span className="hidden sm:inline font-mono text-[10px] text-[var(--ui-text-tertiary)]">
                    ({sha.slice(0, 7)})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)]">{t.aboutSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel || 'Close'}
            className="rounded-lg p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-tertiary)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Split Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--ui-border-primary)] overflow-y-auto">
          {/* Columna 1: About */}
          <section className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--ui-accent)]">
              <Info className="h-4 w-4" />
              <span>{t.aboutTab}</span>
            </div>

            <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--ui-text-secondary)]">
              {t.aboutDesc}
            </p>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--ui-text-primary)] uppercase tracking-wider">
                {t.aboutFeaturesTitle}
              </h3>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <strong className="text-[var(--ui-text-primary)] font-medium">
                      {t.aboutFeature1Title}:
                    </strong>{' '}
                    <span className="text-[var(--ui-text-secondary)]">{t.aboutFeature1Desc}</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <strong className="text-[var(--ui-text-primary)] font-medium">
                      {t.aboutFeature2Title}:
                    </strong>{' '}
                    <span className="text-[var(--ui-text-secondary)]">{t.aboutFeature2Desc}</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <strong className="text-[var(--ui-text-primary)] font-medium">
                      {t.aboutFeature3Title}:
                    </strong>{' '}
                    <span className="text-[var(--ui-text-secondary)]">{t.aboutFeature3Desc}</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Repositorio Open Source */}
            <div className="pt-2 border-t border-[var(--ui-border-primary)] space-y-2">
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] p-3 text-xs transition hover:border-[var(--ui-accent-border)] hover:bg-[var(--ui-accent-muted)] group"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-bg-primary)] border border-[var(--ui-border-primary)] text-[var(--ui-text-primary)]">
                    <Github className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-semibold text-[var(--ui-text-primary)] flex items-center gap-1.5">
                      {t.aboutRepoButton}
                      <span className="rounded bg-[var(--ui-bg-badge)] px-1.5 py-0.2 text-[9px] font-mono text-[var(--ui-text-tertiary)]">
                        {t.aboutOpenSource}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--ui-text-tertiary)]">
                      AcoranGonzalezMoray/DownCV
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-[var(--ui-text-tertiary)] group-hover:text-[var(--ui-accent)] transition shrink-0" />
              </a>
              <p className="text-[11px] text-[var(--ui-text-muted)] text-center sm:text-left">
                {t.aboutLicense}
              </p>
            </div>
          </section>

          {/* Columna 2: Privacidad y Arquitectura */}
          <section className="p-5 sm:p-6 space-y-5 bg-[var(--ui-bg-secondary)]/50">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--ui-privacy-title)]">
              <ShieldCheck className="h-4 w-4 text-[var(--ui-privacy-icon)]" />
              <span>{t.privacyTab}</span>
            </div>

            <div className="rounded-xl border border-[var(--ui-privacy-border)] bg-[var(--ui-privacy-bg)] p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-[var(--ui-privacy-title)] font-semibold text-xs sm:text-[13px]">
                <Lock className="h-3.5 w-3.5 text-[var(--ui-privacy-icon)] shrink-0" />
                <span>{t.privacyClientTitle}</span>
              </div>
              <p className="text-[11px] text-[var(--ui-privacy-text)] leading-relaxed font-normal">
                {t.privacyClientSubtitle}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--ui-text-primary)] uppercase tracking-wider">
                {t.privacyHowItWorks}
              </h3>
              <ul className="space-y-2.5 text-xs text-[var(--ui-text-secondary)]">
                <li className="flex items-start gap-2.5">
                  <HardDrive className="h-4 w-4 shrink-0 text-[var(--ui-accent)] mt-0.5" />
                  <span className="leading-relaxed">{t.privacyStorageDesc}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Cpu className="h-4 w-4 shrink-0 text-[var(--ui-accent)] mt-0.5" />
                  <span className="leading-relaxed">{t.privacyProcessingDesc}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <EyeOff className="h-4 w-4 shrink-0 text-[var(--ui-accent)] mt-0.5" />
                  <span className="leading-relaxed">{t.privacyNetworkDesc}</span>
                </li>
              </ul>
            </div>

            {/* Aviso de DEMO (Solo en modo producción GitHub Pages) */}
            {isDemo && (
              <div
                data-testid="demo-notice-box"
                className="rounded-xl border border-[var(--ui-demo-border)] bg-[var(--ui-demo-bg)] p-3.5 space-y-1.5"
              >
                <div className="flex items-center gap-2 text-[var(--ui-demo-title)] font-semibold text-xs">
                  <AlertTriangle className="h-4 w-4 text-[var(--ui-demo-icon)] shrink-0" />
                  <span>{t.privacyDemoTitle}</span>
                </div>
                <p className="text-[11px] text-[var(--ui-demo-text)] leading-relaxed font-normal">
                  {t.privacyDemoDesc}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-5 py-3 shrink-0">
          <span className="text-[11px] text-[var(--ui-text-muted)]">
            DownCV · {t.aboutOpenSource}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs font-semibold text-[var(--ui-text-inverse)] bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] transition"
          >
            {t.updateResolvedClose || 'OK'}
          </button>
        </footer>
      </div>
    </div>
  );
}
