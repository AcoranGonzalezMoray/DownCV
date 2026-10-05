import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Link2,
  Github,
  Gitlab,
  Globe,
  Linkedin,
  ExternalLink,
  Eye,
  X,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import useContactVerification from '../hooks/useContactVerification';
import { hostOf } from '../utils/contactScan';

const ICONS = { email: Mail, phone: Phone, link: Link2 };

const SITE_ICONS = { 'linkedin.com': Linkedin, 'github.com': Github, 'gitlab.com': Gitlab };
const ISSUE_KEYS = {
  noTld: 'contactIssueNoTld',
  multipleEmails: 'contactIssueMultipleEmails',
  multiplePhones: 'contactIssueMultiplePhones',
  noProtocol: 'contactIssueNoProtocol',
  noCountryCode: 'contactIssueNoCountryCode',
  short: 'contactIssueShort',
  hidden: 'contactIssueHidden',
  looksLikeFile: 'contactIssueLooksLikeFile',
};
const PROBLEM_KEYS = {
  noEmail: 'contactProblemNoEmail',
  noPhone: 'contactProblemNoPhone',
  noLink: 'contactProblemNoLink',
  multipleEmails: 'contactIssueMultipleEmails',
  multiplePhones: 'contactIssueMultiplePhones',
  linkWithoutProtocol: 'contactIssueNoProtocol',
  hiddenLinkUrl: 'contactIssueHidden',
  malformedEmail: 'contactProblemMalformedEmail',
};

const hrefOf = (item) =>
  item.href ||
  (/^https?:/i.test(item.value) ? item.value : `https://${item.value.replace(/^www\./i, 'www.')}`);

export default function ContactWarnings({ markdown, t, open: openProp, onOpenChange }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange || setOpenState;
  const [preview, setPreview] = useState(null);
  const {
    items,
    problems,
    verified,
    dismissed,
    pending,
    checked,
    done,
    warnable,
    hasWarning,
    mark,
    ignore,
    checkAgain,
  } = useContactVerification(markdown);
  const hasMarks = checked > 0 || Object.keys(dismissed).length > 0;

  useEffect(() => {
    setPreview(null);
  }, [markdown]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const markAndReset = (id) => {
    mark(id);
    setPreview(null);
  };
  const checkEverythingAgain = () => {
    checkAgain();
    setPreview(null);
  };

  if (items.length === 0 && problems.length === 0) {
    return null;
  }

  return (
    <div className="relative no-print shrink-0">
      <div
        className="flex items-center gap-2 px-4 py-1.5 border-b text-[11px]"
        style={
          hasWarning
            ? { background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.35)' }
            : { background: 'var(--ui-bg-tertiary)' }
        }
      >
        {hasWarning ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}
        <span className="font-medium text-[var(--ui-text-secondary)]">
          {hasWarning ? t.contactWarningTitle : t.contactWarningDone}
        </span>
        {hasWarning && (
          <span className="text-[var(--ui-text-tertiary)]">
            {items.length > 0 ? `${pending.length} ${t.contactWarningPending}` : t.contactNoData}
            {warnable.length > 0 && <span className="text-amber-400"> · {warnable.length}</span>}
          </span>
        )}
        {!hasWarning && checked > 0 && (
          <span className="text-emerald-400">
            {checked}/{items.length} {t.contactProgress}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
        >
          {t.contactWarningOpen}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {open && (
        <div className="absolute right-4 top-full mt-1 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ui-border-primary)]">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-semibold text-[var(--ui-text-primary)] flex-1 truncate">
              {t.contactWarningTitle}
            </h3>
            {items.length > 0 && (
              <span className="text-[10px] font-mono text-[var(--ui-text-tertiary)]">
                {checked}/{items.length} {t.contactProgress}
              </span>
            )}
            {hasMarks && (
              <button
                type="button"
                onClick={checkEverythingAgain}
                title={t.contactCheckAgain}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--ui-border-primary)] text-[10px] text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
              >
                <RotateCcw className="w-3 h-3" /> {t.contactCheckAgainShort}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]"
              aria-label={t.contactClose}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {items.length > 0 && (
            <div className="h-1 bg-[var(--ui-bg-tertiary)]">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${(checked / items.length) * 100}%` }}
              />
            </div>
          )}

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {problems.filter((problem) => PROBLEM_KEYS[problem]).length > 0 && (
              <ul className="px-3 pt-2 space-y-1">
                {problems
                  .filter((problem) => PROBLEM_KEYS[problem])
                  .map((problem) => (
                    <li key={problem} className="text-[10px] text-amber-400 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-px shrink-0" />{' '}
                      {t[PROBLEM_KEYS[problem]]}
                    </li>
                  ))}
              </ul>
            )}

            {items.map((item) => {
              const Icon = ICONS[item.kind];
              const isVerified = Boolean(verified[item.id]);
              const isDismissed = Boolean(dismissed[item.id]);
              const isOpen = preview?.id === item.id;
              const issues = item.issues.filter((issue) => ISSUE_KEYS[issue]);
              return (
                <div
                  key={item.id}
                  className={`border-b border-[var(--ui-border-primary)] last:border-0 ${isVerified || isDismissed ? 'opacity-55' : ''}`}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Icon className="w-3.5 h-3.5 text-[var(--ui-text-tertiary)] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-mono text-[var(--ui-text-primary)] truncate"
                        title={item.value}
                      >
                        {item.value}
                      </div>
                      <div className="text-[10px] text-[var(--ui-text-tertiary)]">
                        {t[`contactKind${item.kind.charAt(0).toUpperCase()}${item.kind.slice(1)}`]}
                        {issues.map((issue) => (
                          <span key={issue} className="ml-1 text-amber-400">
                            · {t[ISSUE_KEYS[issue]]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isVerified ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 shrink-0">
                        <Check className="w-3.5 h-3.5" /> {t.contactVerified}
                      </span>
                    ) : (
                      <>
                        {item.kind === 'link' && (
                          <button
                            type="button"
                            onClick={() => setPreview(isOpen ? null : item)}
                            title={t.contactOpenPage}
                            className={`p-1 rounded border transition shrink-0 ${isOpen ? 'border-[var(--ui-accent)] text-[var(--ui-accent)]' : 'border-[var(--ui-border-primary)] text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => markAndReset(item.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-[var(--ui-accent)]/40 text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/10 shrink-0"
                        >
                          <Check className="w-3 h-3" /> {t.contactVerify}
                        </button>
                        <button
                          type="button"
                          onClick={() => ignore(item.id)}
                          title={t.contactDismiss}
                          className="p-1 text-[var(--ui-text-tertiary)] hover:text-red-400 transition shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {isOpen && item.kind === 'link' && (
                    <div className="px-3 pb-3 space-y-1.5">
                      <div className="relative h-44 rounded border border-[var(--ui-border-primary)] overflow-hidden bg-[var(--ui-bg-primary)]">
                        <iframe
                          src={hrefOf(item)}
                          title={item.value}
                          className="w-full h-full"
                          sandbox="allow-scripts allow-same-origin allow-popups"
                          referrerPolicy="no-referrer"
                        />
                        <a
                          href={hrefOf(item)}
                          target="_blank"
                          rel="noreferrer noopener"
                          title={`${hostOf(item)} — ${t.contactOpenExternal}`}
                          aria-label={`${hostOf(item)} — ${t.contactOpenExternal}`}
                          className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--ui-bg-card)]/90 border border-[var(--ui-border-primary)] text-[var(--ui-text-secondary)] shadow-md backdrop-blur transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-[var(--ui-text-inverse)] active:scale-95"
                        >
                          {(() => {
                            const Icon = SITE_ICONS[hostOf(item)] || Globe;
                            return <Icon className="w-3.5 h-3.5" />;
                          })()}
                        </a>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--ui-text-tertiary)]">
                        <span className="truncate font-mono">{hrefOf(item)}</span>
                        <a
                          href={hrefOf(item)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-[var(--ui-accent)] hover:underline shrink-0"
                        >
                          {t.contactOpenExternal} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {done && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--ui-border-primary)] text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t.contactAllDone}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
