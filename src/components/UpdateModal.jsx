import { useEffect, useState } from 'react';
import {
  ArrowUpCircle,
  Check,
  CheckCheck,
  Copy,
  ExternalLink,
  GitCommitVertical,
  Loader2,
  X,
} from 'lucide-react';
import { compareUrlFor } from '../utils/versionCheck';
import { UPDATE_COMMAND } from '../data/versionInfo';

export default function UpdateModal({
  open,
  onDismiss,
  onUpdate,
  info,
  currentSha,
  isDev,
  isUpdating,
  isChecking,
  error,
  resolved,
  t,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setCopied(false);
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!open) {
    return null;
  }

  const commits = info?.commits || [];
  const behindBy = info?.aheadBy || 0;
  const compareUrl = info?.compareUrl || compareUrlFor(currentSha);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(UPDATE_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const resolvedText =
    resolved?.previousCount > 0
      ? `${t.updateResolvedHad} ${resolved.previousCount} ${t.updateResolvedCommits} ${t.updateResolvedNow}`
      : t.updateResolvedNow;

  return (
    <div className="fixed inset-0 z-[100] no-print flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onDismiss} />
      {resolved ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.updateResolvedTitle}
          className="relative w-full max-w-sm space-y-3 rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-4 shadow-2xl"
        >
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400">
              <CheckCheck className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">
                {t.updateResolvedTitle}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--ui-text-tertiary)]">
                {resolvedText}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t.updateResolvedClose}
              className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onDismiss}
              autoFocus
              className="rounded-lg bg-[var(--ui-accent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ui-text-inverse)] transition hover:bg-[var(--ui-accent-hover)]"
            >
              {t.updateResolvedClose}
            </button>
          </div>
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.updateTitle}
          className="relative flex max-h-[90vh] w-full max-w-md flex-col space-y-4 overflow-y-auto rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-4 shadow-2xl"
        >
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded-lg bg-[var(--ui-accent-muted)] p-1.5 text-[var(--ui-accent)]">
              <ArrowUpCircle className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--ui-text-primary)]">
                {t.updateTitle}
              </h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ui-text-tertiary)]">
                {t.updateBadge} {behindBy} {t.updateBadgeSuffix}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t.updateDismiss}
              className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--ui-text-tertiary)]">{t.updateRunning}</span>
              <code className="font-mono text-[var(--ui-text-secondary)]">{currentSha || '—'}</code>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--ui-text-tertiary)]">{t.updateLatest}</span>
              <code className="font-mono text-[var(--ui-text-secondary)]">{t.updateBranch}</code>
            </div>
          </div>

          {commits.length > 0 && (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {commits.map((commit) => (
                <li
                  key={commit.sha}
                  className="flex items-start gap-2 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2"
                >
                  <GitCommitVertical className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ui-accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-[var(--ui-text-primary)]">
                      {commit.message}
                    </p>
                    <p className="text-[10px] text-[var(--ui-text-muted)]">
                      {commit.sha}
                      {commit.author ? ` · ${commit.author}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isDev && (
            <div className="space-y-1.5 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2.5">
              <p className="text-[11px] leading-relaxed text-[var(--ui-text-tertiary)]">
                {t.updateDockerHint}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md bg-[var(--ui-bg-input)] px-2 py-1.5 font-mono text-[11px] text-[var(--ui-text-primary)]">
                  {UPDATE_COMMAND}
                </code>
                <button
                  type="button"
                  onClick={copyCommand}
                  aria-label={t.updateCopyCommand}
                  className="shrink-0 rounded-md border border-[var(--ui-border-primary)] px-2 py-1.5 text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {isDev && error && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-400">
              {error}
            </p>
          )}

          <a
            href={compareUrl}
            target="_blank"
            rel="noreferrer"
            referrerPolicy="no-referrer"
            className="flex items-center gap-1.5 text-[11px] text-[var(--ui-text-link)] transition hover:text-[var(--ui-text-link-hover)]"
          >
            <ExternalLink className="h-3 w-3" />
            {t.updateViewGithub}
          </a>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-[var(--ui-border-primary)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
            >
              {t.updateDismiss}
            </button>
            {isDev && (
              <button
                type="button"
                onClick={onUpdate}
                disabled={isUpdating || isChecking}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--ui-accent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ui-text-inverse)] transition hover:bg-[var(--ui-accent-hover)] disabled:opacity-60"
              >
                {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                {t.updateNow}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
