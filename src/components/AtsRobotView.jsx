import { useEffect, useRef, useState } from 'react';
import { Bot, Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const MAX_PAGES = 5;

const PAGE_BREAK = /\n[ \t]*\n+/;

function chunkLines(lines, count) {
  const size = Math.ceil(lines.length / count) || 1;
  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    chunks.push(lines.slice(index * size, (index + 1) * size).join('\n'));
  }
  return chunks;
}

export function resolvePages(record) {
  const stored = (record.pageTexts || []).map((page) => (typeof page === 'string' ? page : ''));
  const count = Number(record.pageCount) || 0;
  if (count && stored.length === count) {
    return stored;
  }
  if (!count) {
    return stored.length ? stored : [record.text || ''];
  }
  const text = record.text || '';
  if (!text) {
    return stored.length ? stored : chunkLines([], count);
  }
  const breaks = text.split(PAGE_BREAK);
  if (breaks.length === count) {
    return breaks;
  }
  return chunkLines(text.split('\n'), count);
}

export default function AtsRobotView({ record, t }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [onlyDoubtful, setOnlyDoubtful] = useState(false);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  if (!record) {
    return null;
  }
  const pages = resolvePages(record);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pages.join('\n\n'));
      setCopied(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left text-[11px] font-semibold text-[var(--ui-text-primary)] transition hover:text-[var(--ui-accent)]"
        >
          <Bot className="w-3.5 h-3.5 shrink-0 text-[var(--ui-accent)]" />
          <span className="min-w-0">{t.atsRobotTitle}</span>
          <span className="shrink-0 font-mono text-[10px] font-normal text-[var(--ui-text-muted)]">
            {record.charCount} {t.atsRobotChars}
          </span>
          {open ? (
            <ChevronUp className="ml-auto w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronDown className="ml-auto w-3.5 h-3.5 shrink-0" />
          )}
        </button>
        <button
          type="button"
          onClick={copy}
          title={t.atsRobotCopy}
          aria-label={t.atsRobotCopy}
          className="p-1 text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-accent)]"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-[var(--ui-border-primary)] px-3 py-2">
          <p className="text-[10px] leading-relaxed text-[var(--ui-text-tertiary)]">
            {t.atsRobotIntro}
          </p>

          <label className="flex items-center gap-1.5 text-[10px] text-[var(--ui-text-secondary)]">
            <input
              type="checkbox"
              checked={onlyDoubtful}
              onChange={(event) => setOnlyDoubtful(event.target.checked)}
              className="accent-[var(--ui-accent)]"
            />
            {t.atsRobotOnlyDoubtful}
          </label>

          {pages.map((text, index) => {
            const doubtful = text
              .split('\n')
              .filter((line) => /\uFFFD|Ã.|Â.|\?[A-Za-z]|\b[a-z]{1,2}\s*$/.test(line));
            const shown = onlyDoubtful ? doubtful : text.split('\n');
            if (shown.length === 0) {
              return null;
            }
            return (
              <details
                key={index}
                open={!onlyDoubtful || doubtful.length > 0}
                className="rounded-lg border border-[var(--ui-border-primary)]"
              >
                <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2 py-1.5 text-[10px] text-[var(--ui-text-secondary)]">
                  {t.atsRobotPage} {index + 1}
                  <span className="font-mono text-[var(--ui-text-muted)]">
                    ({text.split('\n').filter(Boolean).length} {t.atsRobotLines})
                  </span>
                  {doubtful.length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-amber-400">
                      <AlertTriangle className="w-3 h-3" /> {doubtful.length}
                    </span>
                  )}
                </summary>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border-t border-[var(--ui-border-primary)] px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[var(--ui-text-secondary)]">
                  {shown.join('\n') || t.atsRobotPageEmpty}
                </pre>
              </details>
            );
          })}

          {pages.length > MAX_PAGES && (
            <p className="text-[10px] text-[var(--ui-text-muted)]">
              {t.atsRobotMore.replace('{n}', pages.length - MAX_PAGES)}
            </p>
          )}

          <p className="border-t border-[var(--ui-border-primary)] pt-2 text-[10px] leading-relaxed text-[var(--ui-text-muted)]">
            {t.atsRobotFootnote}
          </p>
        </div>
      )}
    </section>
  );
}
