import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Award,
  Loader2,
  FileText,
  Upload,
  X,
  Gauge,
  History,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Wand2,
  Undo2,
  GitCompare,
  Briefcase,
  Target,
  Sparkles,
  Check,
  FileSignature,
  FileDown,
} from 'lucide-react';
import { hashMarkdown, toHistoryRecord } from '../utils/atsPdfHistory';
import { applyFix, applyAllFixes, canApplyFix, pendingFixes } from '../utils/markdownFixes';
import { diffLines, diffStats, scoreTrend } from '../utils/evaluationDiff';
import { matchJobDescription } from '../utils/jobMatcher';
import ScoreBreakdown from './ScoreBreakdown';
import AtsRobotView from './AtsRobotView';

const MAX_HISTORY = 20;
const MAX_FIT_ROUNDS = 3;
const FIT_ROUND_TIGHTENING = 0.94;
const round2 = (value) => Math.round(value * 100) / 100;

const scoreClasses = (score) => {
  if (score >= 85) {
    return 'text-[var(--ui-accent)] border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)]';
  }
  if (score >= 70) {
    return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
  }
  return 'text-red-400 border-red-400/30 bg-red-400/10';
};

function ScoreCircle({ score, size = 'w-16 h-16' }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  return (
    <div className={`relative ${size} shrink-0 ${scoreClasses(score)}`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--ui-border-primary)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold font-mono">
        {score}
      </span>
    </div>
  );
}

function TrendSparkline({ points }) {
  if (points.length < 2) {
    return null;
  }
  const width = 168;
  const height = 34;
  const scores = points.map((point) => point.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - 3 - ((point.score - min) / span) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-9"
      preserveAspectRatio="none"
      role="img"
    >
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="var(--ui-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => {
        const [x, y] = coords[index].split(',');
        return <circle key={point.id || index} cx={x} cy={y} r="1.8" fill="var(--ui-accent)" />;
      })}
    </svg>
  );
}

function TextDiff({ before, after, t }) {
  const stats = diffStats(before, after);
  if (!stats.changed) {
    return <p className="text-[11px] text-[var(--ui-text-tertiary)] italic">{t.atsPdfNoDiff}</p>;
  }

  const changes = diffLines(before, after);
  const visible = [];
  changes.forEach((change, index) => {
    if (change.type === 'same') {
      if (index > 0 && index < changes.length - 1) {
        visible.push({ type: 'same', text: '…' });
      }
      return;
    }
    visible.push(change);
  });

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[var(--ui-text-tertiary)]">
        <span className="text-emerald-400">
          +{stats.added} {t.atsPdfDiffAdded}
        </span>
        {' · '}
        <span className="text-red-400">
          -{stats.removed} {t.atsPdfDiffRemoved}
        </span>
      </p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--ui-bg-primary)] p-2 font-mono text-[10px] leading-relaxed">
        {visible.map((change, index) => (
          <span
            key={index}
            className={
              change.type === 'added'
                ? 'block text-emerald-400'
                : change.type === 'removed'
                  ? 'block text-red-400 line-through opacity-70'
                  : 'block text-[var(--ui-text-tertiary)]'
            }
          >
            {change.type === 'added' ? '+ ' : change.type === 'removed' ? '- ' : '  '}
            {change.text}
          </span>
        ))}
      </pre>
    </div>
  );
}

function CheckRow({ check, onFix, canFix, fixLabel }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {check.pass ? (
        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
      ) : (
        <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
      )}
      <span className="min-w-0 flex-1">
        <span className="font-medium text-[var(--ui-text-primary)]">{check.title}</span>
        <span className="text-[var(--ui-text-tertiary)]">
          {' '}
          · {check.points}/{check.max}
        </span>
        <span className="block text-[var(--ui-text-secondary)]">{check.msg}</span>
        {!check.pass && check.examples?.length > 0 && (
          <ul className="mt-1 space-y-0.5 border-l-2 border-[var(--ui-border-primary)] pl-2">
            {check.examples.map((example, index) => (
              <li
                key={index}
                className="text-[10px] leading-relaxed text-[var(--ui-text-tertiary)]"
              >
                <ArrowRight className="w-3 h-3 inline text-[var(--ui-accent)]" /> {example}
              </li>
            ))}
          </ul>
        )}
        {!check.pass && canFix && (
          <button
            type="button"
            onClick={onFix}
            className="mt-1 inline-flex items-center gap-1 rounded border border-[var(--ui-accent)]/40 px-1.5 py-0.5 text-[10px] font-medium text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/10"
          >
            <Wand2 className="w-3 h-3" /> {fixLabel}
          </button>
        )}
      </span>
    </li>
  );
}

function EvaluationDetails({ record, previous, t, stale, showDiff, onToggleDiff }) {
  const date = new Date(record.createdAt);
  return (
    <div className="mt-2 space-y-3 border-l-2 border-[var(--ui-border-primary)] pl-3">
      <div className="flex items-center gap-2">
        <ScoreCircle score={record.score} size="w-12 h-12" />
        <div className="text-[11px] text-[var(--ui-text-tertiary)] leading-relaxed">
          <div className="flex items-center gap-1 font-semibold text-[var(--ui-text-primary)]">
            <Award className="w-3 h-3" /> {t.gradeLabel}: {record.grade}
          </div>
          <div>{date.toLocaleString()}</div>
          <div>
            {record.pageCount} {t.atsPdfPages} · {record.charCount} {t.atsPdfChars} ·{' '}
            {record.wordCount} {t.atsPdfWords}
          </div>
          <div>
            {t.atsPdfSize}: {(record.bytes / 1024).toFixed(1)} KB
          </div>
          {stale && (
            <div className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" /> {t.atsPdfStale}
            </div>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {(record.checks || []).map((check) => (
          <CheckRow key={check.id || check.title} check={check} />
        ))}
      </ul>
      {previous && (
        <div>
          <button
            type="button"
            onClick={onToggleDiff}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--ui-text-secondary)] transition hover:text-[var(--ui-text-primary)]"
          >
            <GitCompare className="w-3.5 h-3.5" /> {showDiff ? t.atsPdfCompare : t.atsPdfCompare}
          </button>
          {showDiff && (
            <div className="mt-1.5">
              <TextDiff before={previous.text || ''} after={record.text || ''} t={t} />
            </div>
          )}
        </div>
      )}
      <details className="text-[11px] text-[var(--ui-text-tertiary)]">
        <summary className="cursor-pointer select-none text-[var(--ui-text-secondary)]">
          {t.atsPdfChars}
        </summary>
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--ui-bg-primary)] p-2 font-mono text-[10px] leading-relaxed">
          {record.text}
        </pre>
      </details>
    </div>
  );
}

export default function ATSAnalyzer({
  markdown,
  styles,
  setStyles,
  setMarkdown,
  t,
  lang,
  history,
  setHistory,
  previewPageCount = 1,
  currentDraftName = '',
  jobBrief = '',
  onJobBriefChange = null,
  onRequestLetter = null,
}) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [fitBackup, setFitBackup] = useState(null);
  const [fitWatch, setFitWatch] = useState(null);
  const fitRounds = useRef(0);
  const [subTab, setSubTab] = useState('ats');
  const [targetLevel, setTargetLevel] = useState('mid');
  const [jobMatch, setJobMatch] = useState(null);

  const jobDesc = jobBrief;
  const setJobDesc = onJobBriefChange || (() => {});

  const currentHash = hashMarkdown(markdown || '');
  const latest = history[0] || null;
  const trend = useMemo(() => scoreTrend(history), [history]);
  const needsFit = latest && latest.pageCount > 1;

  const pushRecord = (record) => {
    setHistory((previous) => {
      const head = previous[0];
      const list =
        head && head.artifactKey === record.artifactKey && head.score === record.score
          ? [record, ...previous.slice(1)]
          : [record, ...previous];
      return list.slice(0, MAX_HISTORY);
    });
  };

  const runEvaluation = async (sourceMarkdown = markdown, sourceStyles = styles) => {
    setStatus('running');
    setError(null);
    setNotice(null);
    setFitWatch(null);
    try {
      const { evaluatePdf } = await import('../utils/atsPdfEvaluation');
      const evaluation = await evaluatePdf(sourceMarkdown, sourceStyles, {
        lang,
        bullet: sourceStyles.bulletStyle,
      });
      const record = toHistoryRecord(evaluation);
      pushRecord(record);
      setOpenId(null);
      setShowDiff(false);
      setStatus('idle');
      return record;
    } catch (e) {
      setError(e?.message || t.atsPdfError);
      setStatus('error');
      return null;
    }
  };

  const fitToOnePage = async ({ tighten = 1 } = {}) => {
    setStatus('fitting');
    setError(null);
    setNotice(null);
    try {
      const { fitToPages, scaleLayout } = await import('../utils/pdfBuilder');
      const base = tighten < 1 ? scaleLayout(styles, tighten) : styles;
      const result = fitToPages(markdown, base, {
        bullet: styles.bulletStyle,
        targetPages: 1,
        maxScale: tighten,
      });
      const next = result.changed ? result.styles : base;

      if (!layoutMoved(styles, next)) {
        setError(t.atsPdfFitImpossible);
        setStatus('error');
        return;
      }
      if (!fitBackup) {
        setFitBackup(styles);
      }
      setStyles((previous) => ({ ...previous, ...pickLayout(next) }));
      await runEvaluation(markdown, next);
      if (result.pages > 1) {
        setNotice(
          t.atsPdfFitPartial
            .replace('{n}', String(result.originalPages))
            .replace('{m}', String(result.pages)),
        );
      }
      setFitWatch({ goal: 1, tighten: round2(tighten * FIT_ROUND_TIGHTENING) });
    } catch (e) {
      setError(e?.message || t.atsPdfError);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!fitWatch || status !== 'idle' || fitRounds.current >= MAX_FIT_ROUNDS) {
      return;
    }
    if (previewPageCount <= fitWatch.goal) {
      setFitWatch(null);
      return;
    }
    fitRounds.current += 1;
    fitToOnePage({ tighten: fitWatch.tighten });
  }, [previewPageCount, fitWatch, status]);

  const importPdfRef = useRef(null);
  const [imported, setImported] = useState(null);
  const [importStatus, setImportStatus] = useState('idle');

  const analysePdfFile = async (file) => {
    if (!file) {
      return;
    }
    setImportStatus('running');
    setError(null);
    try {
      const { evaluatePdfFile } = await import('../utils/atsPdfEvaluation');
      setImported(await evaluatePdfFile(file, { lang }));
      setImportStatus('done');
    } catch (e) {
      setImported(null);
      setImportStatus('error');
      setError(e?.message || t.atsPdfError);
    }
  };

  const downloadReport = async () => {
    if (!latest) {
      return;
    }
    const { downloadAtsReport } = await import('../utils/atsReport');
    const { scoreDimensions } = await import('../utils/atsDimensions');
    downloadAtsReport(latest, {
      dimensions: scoreDimensions(latest.checks),
      t,
      sourceMarkdown: markdown,
      title: currentDraftName || t.atsPreviewTitle,
    });
  };

  const revertFit = () => {
    if (!fitBackup) {
      return;
    }
    setStyles((previous) => ({ ...previous, ...pickLayout(fitBackup) }));
    setFitBackup(null);
    fitRounds.current = 0;
    setFitWatch(null);
  };

  const applyCheckFix = async (check) => {
    const result = applyFix(markdown, check.fix, lang);
    if (!result) {
      return;
    }
    setMarkdown(result.markdown);
    await runEvaluation(result.markdown, styles);
  };

  const applyEveryFix = async () => {
    const result = applyAllFixes(markdown, latest?.checks, lang);
    if (!result.applied.length) {
      return;
    }
    setStatus('running');
    setMarkdown(result.markdown);
    await runEvaluation(result.markdown, styles);
  };

  const busy = status === 'running' || status === 'fitting';

  const batchFixes = useMemo(
    () => (latest ? pendingFixes(markdown, latest.checks, lang) : []),
    [latest, markdown, lang],
  );

  return (
    <div className="p-4 bg-[var(--ui-bg-secondary)] border-l border-[var(--ui-border-primary)] h-full overflow-y-auto space-y-5 text-[var(--ui-text-secondary)] no-print">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--ui-border-primary)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--ui-accent)]" />
          <h2 className="font-semibold text-sm text-[var(--ui-text-primary)]">{t.atsPdfTitle}</h2>
        </div>
        <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-[var(--ui-bg-badge)] text-[var(--ui-text-tertiary)] border border-[var(--ui-border-primary)]">
          PDF · ATS
        </span>
      </div>

      <div className="flex rounded-lg bg-[var(--ui-bg-primary)] p-0.5 border border-[var(--ui-border-primary)] text-xs font-medium">
        <button
          type="button"
          onClick={() => setSubTab('ats')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition ${subTab === 'ats' ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)] shadow-sm' : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> {t.atsSubAnalyzer}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('job')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition ${subTab === 'job' ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)] shadow-sm' : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'}`}
        >
          <Briefcase className="w-3.5 h-3.5" /> {t.atsSubJob}
        </button>
      </div>

      {subTab === 'job' ? (
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]">
              <Target className="w-3 h-3 text-[var(--ui-accent)]" /> {t.jobMatcherSeniority}
            </label>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {[
                { id: 'junior', label: t.levelJunior },
                { id: 'mid', label: t.levelMid },
                { id: 'executive', label: t.levelExecutive },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setTargetLevel(lvl.id)}
                  className={`rounded border px-1 py-1 text-center font-medium transition ${targetLevel === lvl.id ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]' : 'border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'}`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--ui-text-primary)]">
              {t.jobMatcherTitle}
            </label>
            <textarea
              rows={4}
              aria-label={t.jobMatcherTitle}
              value={jobDesc}
              onChange={(e) => {
                setJobDesc(e.target.value);
                setJobMatch(null);
              }}
              placeholder={t.jobMatcherPlaceholder}
              className="w-full resize-none rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2.5 text-xs text-[var(--ui-text-primary)] focus:border-[var(--ui-accent)] focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={!jobDesc.trim()}
            onClick={() => {
              const res = matchJobDescription(jobDesc, markdown, { targetLevel, lang });
              setJobMatch(res);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ui-accent)] py-2 text-xs font-semibold text-[var(--ui-text-inverse)] transition hover:bg-[var(--ui-accent-hover)] disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t.jobMatcherRun}
          </button>

          {jobMatch && (
            <div className="space-y-4 border-t border-[var(--ui-border-primary)] pt-2">
              <div
                className={`flex items-center gap-3 rounded-xl border p-3 ${scoreClasses(jobMatch.score)}`}
              >
                <ScoreCircle score={jobMatch.score} />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-[var(--ui-text-primary)]">
                    {t.jobMatcherRate}
                  </span>
                  <p className="text-[11px] opacity-80">
                    {jobMatch.matchedKeywords.length} / {jobMatch.totalKeywords} {t.jobMatcherFound}
                  </p>
                </div>
              </div>

              {jobMatch.matchedKeywords.length > 0 && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    <Check className="w-3 h-3" /> {t.jobMatcherMatched} (
                    {jobMatch.matchedKeywords.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {jobMatch.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded border border-emerald-800/40 bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {jobMatch.missingKeywords.length > 0 && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> {t.jobMatcherGaps} (
                    {jobMatch.missingKeywords.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {jobMatch.missingKeywords.slice(0, 15).map((kw, i) => (
                      <span
                        key={i}
                        className="rounded border border-amber-800/40 bg-amber-950 px-2 py-0.5 font-mono text-[10px] text-amber-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {jobMatch.recommendations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]">
                    {t.jobMatcherRecommendations}
                  </span>
                  <ul className="space-y-1 text-[11px] text-[var(--ui-text-secondary)]">
                    {jobMatch.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-2 leading-relaxed"
                      >
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {onRequestLetter && (
                <button
                  type="button"
                  onClick={() => onRequestLetter({ jobDescription: jobDesc, jobMatch })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ui-accent)]/40 bg-[var(--ui-accent-muted)] px-3 py-2 text-xs font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/15"
                >
                  <FileSignature className="w-3.5 h-3.5" /> {t.jobMatcherWriteLetter}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-[var(--ui-text-tertiary)]">{t.atsPdfIntro}</p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => runEvaluation()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--ui-accent)]/40 bg-[var(--ui-accent-muted)] px-3 py-2 text-sm font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/15 disabled:opacity-60 disabled:cursor-progress"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{' '}
                  {status === 'fitting' ? t.atsPdfFitApplied : t.atsPdfEvaluating}
                </>
              ) : (
                <>
                  <Gauge className="w-4 h-4" /> {t.atsPdfEvaluate}
                </>
              )}
            </button>

            <div className="flex flex-wrap gap-2">
              {fitBackup && (
                <button
                  type="button"
                  onClick={revertFit}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--ui-border-primary)] px-2 py-1.5 text-xs font-medium transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
                >
                  <Undo2 className="w-3.5 h-3.5" /> {t.atsPdfRevertFit}
                </button>
              )}
              <button
                type="button"
                onClick={() => importPdfRef.current?.click()}
                disabled={importStatus === 'running'}
                title={t.atsImportHint}
                aria-label={t.atsImportLabel}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--ui-border-primary)] px-2 py-1.5 text-xs font-medium text-[var(--ui-text-tertiary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)] disabled:opacity-60 disabled:cursor-progress"
              >
                {importStatus === 'running' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.atsImportRunning}
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> {t.atsImportLabel}
                  </>
                )}
              </button>
            </div>
            <input
              type="file"
              ref={importPdfRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const [file] = event.target.files || [];
                analysePdfFile(file);
                event.target.value = '';
              }}
            />
          </div>

          {needsFit && (
            <button
              type="button"
              onClick={() => {
                fitRounds.current = 0;
                fitToOnePage();
              }}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-400/20 disabled:opacity-60"
            >
              <Wand2 className="w-3.5 h-3.5" /> {t.atsPdfFitOnePage} ({latest.pageCount}
              <ArrowRight className="w-3 h-3" /> 1)
            </button>
          )}

          {notice && (
            <p className="text-[11px] leading-relaxed flex items-start gap-2 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {notice}
            </p>
          )}

          {status === 'error' && (
            <p className="text-xs text-red-400 flex items-start gap-2">
              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
            </p>
          )}

          {latest && latest.cvLang && latest.cvLang !== lang && (
            <p className="text-[11px] text-[var(--ui-text-tertiary)] flex items-start gap-2 rounded border border-[var(--ui-border-primary)] px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0 text-[var(--ui-accent)]" />
              {latest.cvLang === 'es' ? t.atsPdfCvIsSpanish : t.atsPdfCvIsEnglish}
            </p>
          )}

          {latest && (
            <section className="space-y-3">
              <div
                className={`rounded-xl border p-3 flex items-center gap-3 ${scoreClasses(latest.score)}`}
              >
                <ScoreCircle score={latest.score} />
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-[var(--ui-text-primary)] flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> {t.gradeLabel}: {latest.grade}
                  </div>
                  <div className="text-[var(--ui-text-tertiary)]">
                    {latest.pageCount} {t.atsPdfPages} · {latest.wordCount} {t.atsPdfWords}
                  </div>
                  <div className="text-[var(--ui-text-tertiary)]">
                    {(latest.bytes / 1024).toFixed(1)} KB
                  </div>
                  {trend.points.length > 1 && (
                    <div className="flex items-center gap-1 mt-0.5 font-medium">
                      {trend.direction === 'up' && (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {trend.direction === 'down' && (
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      )}
                      {trend.direction === 'flat' && (
                        <Minus className="w-3.5 h-3.5 text-[var(--ui-text-tertiary)]" />
                      )}
                      <span
                        className={
                          trend.direction === 'up'
                            ? 'text-emerald-400'
                            : trend.direction === 'down'
                              ? 'text-red-400'
                              : 'text-[var(--ui-text-tertiary)]'
                        }
                      >
                        {trend.delta > 0 ? '+' : ''}
                        {trend.delta}{' '}
                        {
                          t[
                            `atsPdfDelta${trend.direction === 'up' ? 'Up' : trend.direction === 'down' ? 'Down' : 'Flat'}`
                          ]
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {trend.points.length > 1 && (
                <div>
                  <h3 className="text-[10px] uppercase font-mono tracking-wider text-[var(--ui-text-tertiary)] mb-1">
                    {t.atsPdfTrend}
                  </h3>
                  <TrendSparkline points={trend.points} />
                </div>
              )}

              <ScoreBreakdown checks={latest.checks} t={t} lang={lang} />

              <section className="rounded-xl border border-[var(--ui-border-primary)] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ui-text-secondary)]">
                    <Target className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.atsGapsTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={downloadReport}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--ui-border-primary)] px-2 py-1 text-[11px] font-medium text-[var(--ui-text-secondary)] transition hover:border-[var(--ui-accent)]/50 hover:text-[var(--ui-text-primary)]"
                  >
                    <FileDown className="w-3 h-3" /> {t.atsReportLabel}
                  </button>
                </div>
                {latest.gaps?.length ? (
                  <ol className="space-y-1" aria-label={t.atsGapsTitle}>
                    {[...latest.gaps]
                      .sort((a, b) => b.lost - a.lost)
                      .slice(0, 6)
                      .map((gap) => (
                        <li key={gap.id} className="flex items-start gap-2 text-[11px]">
                          <span className="shrink-0 rounded bg-amber-400/10 px-1 font-mono text-[10px] text-amber-400">
                            -{gap.lost}
                          </span>
                          <span className="min-w-0 text-[var(--ui-text-tertiary)]">
                            <span className="font-medium text-[var(--ui-text-secondary)]">
                              {gap.title}
                            </span>{' '}
                            {gap.msg}
                          </span>
                        </li>
                      ))}
                  </ol>
                ) : (
                  <p className="text-[11px] text-[var(--ui-text-tertiary)]">{t.atsGapsEmpty}</p>
                )}
              </section>

              <AtsRobotView record={latest} t={t} />

              <ul className="space-y-2">
                {(latest.checks || []).map((check) => (
                  <CheckRow
                    key={check.id || check.title}
                    check={check}
                    canFix={Boolean(check.fix) && canApplyFix(markdown, check.fix, lang)}
                    fixLabel={
                      t[
                        check.fix?.type === 'insertContact'
                          ? 'atsPdfFixAddContact'
                          : 'atsPdfFixAddSummary'
                      ]
                    }
                    onFix={() => applyCheckFix(check)}
                  />
                ))}
              </ul>

              {batchFixes.length > 1 && (
                <button
                  type="button"
                  onClick={applyEveryFix}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--ui-accent)]/40 bg-[var(--ui-accent-muted)] px-3 py-2 text-xs font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)]/15 disabled:opacity-60 disabled:cursor-progress"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.atsPdfEvaluating}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" /> {t.atsPdfFixAll} ({batchFixes.length})
                    </>
                  )}
                </button>
              )}
            </section>
          )}

          {imported && (
            <section className="rounded-xl border border-[var(--ui-border-primary)] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ui-text-secondary)]">
                  <FileText className="w-3.5 h-3.5 text-[var(--ui-accent)]" /> {t.atsImportTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setImported(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--ui-border-primary)] px-2 py-1 text-[11px] text-[var(--ui-text-tertiary)] transition hover:text-[var(--ui-text-primary)]"
                >
                  <X className="w-3 h-3" /> {t.atsImportDiscard}
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <ScoreCircle score={imported.score} size="w-10 h-10" />
                  <div className="min-w-0 text-[11px] text-[var(--ui-text-tertiary)]">
                    <div className="truncate font-medium text-[var(--ui-text-secondary)]">
                      {imported.fileName}
                    </div>
                    <div>
                      {imported.pageCount} {t.atsPdfPages} · {imported.wordCount} {t.atsPdfWords}
                    </div>
                  </div>
                </div>
                {imported.gaps?.length ? (
                  <ul className="space-y-0.5" aria-label={t.atsGapsTitle}>
                    {imported.gaps.slice(0, 5).map((gap) => (
                      <li key={gap.id} className="flex items-start gap-2 text-[11px]">
                        <span className="shrink-0 rounded bg-red-400/10 px-1 font-mono text-[10px] text-red-400">
                          -{gap.lost}
                        </span>
                        <span className="min-w-0 text-[var(--ui-text-tertiary)]">
                          <span className="font-medium text-[var(--ui-text-secondary)]">
                            {gap.title}
                          </span>{' '}
                          {gap.msg}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[var(--ui-text-tertiary)]">{t.atsGapsEmpty}</p>
                )}
                <AtsRobotView record={imported} t={t} />
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ui-text-tertiary)]">
                <History className="w-3.5 h-3.5" /> {t.atsPdfHistory}
              </h3>
              <ul className="space-y-1.5">
                {history.map((record, index) => {
                  const isOpen = openId === record.id;
                  const stale = record.sourceHash !== currentHash;
                  return (
                    <li key={record.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(isOpen ? null : record.id);
                          setShowDiff(false);
                        }}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${isOpen ? scoreClasses(record.score) : 'border-[var(--ui-border-primary)] hover:border-[var(--ui-accent)]/40'}`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-sm font-bold">{record.score}</span>
                          <span className="text-[11px] truncate">
                            {index === 0
                              ? t.atsPdfLatest
                              : new Date(record.createdAt).toLocaleString()}
                          </span>
                          {stale && <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400" />}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-[var(--ui-text-tertiary)]">
                          {record.pageCount}p
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>
                      {isOpen && (
                        <EvaluationDetails
                          record={record}
                          previous={history[index + 1] || null}
                          t={t}
                          stale={stale}
                          showDiff={showDiff}
                          onToggleDiff={() => setShowDiff((value) => !value)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {history.length === 0 && (
            <p className="text-xs text-[var(--ui-text-tertiary)] italic">{t.atsPdfHistoryEmpty}</p>
          )}
        </>
      )}
    </div>
  );
}

function pickLayout(styles) {
  const { fontSize, lineHeight, marginX, marginY, sectionGap, itemGap } = styles;
  return { fontSize, lineHeight, marginX, marginY, sectionGap, itemGap };
}

function layoutMoved(before, after) {
  return Object.keys(pickLayout(after)).some((key) => before[key] !== after[key]);
}
