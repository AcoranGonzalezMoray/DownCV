import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import useTheme from './hooks/useTheme';
import useLocalStorage from './hooks/useLocalStorage';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useMarkdownHistory from './hooks/useMarkdownHistory';
import useContactVerification from './hooks/useContactVerification';
import useLocalFile from './hooks/useLocalFile';
import MarkdownEditor from './components/MarkdownEditor';
import CVPreview from './components/CVPreview';
import StyleControls from './components/StyleControls';
import ATSAnalyzer from './components/ATSAnalyzer';
import VariantsPanel from './components/VariantsPanel';
import ContactWarnings from './components/ContactWarnings';
import ConfirmDialog from './components/ConfirmDialog';
import CoverLetterModal from './components/CoverLetterModal';
import ImportModal from './components/ImportModal';
import AIAssistantModal from './components/AIAssistantModal';
import AppTour from './components/AppTour';
import ExportMenu from './components/ExportMenu';
import ThemeToggle from './components/ThemeToggle';
import CommandPalette from './components/CommandPalette';
import { sampleCVs, samplesFor, defaultSample } from './data/sampleCVs';
import { translations } from './data/translations';
import { applyTemplate } from './data/templates';
import { exportFilename } from './utils/exportName';
import { offsetAtRatio, SYNC_LOCK_MS } from './utils/scrollSync';
import { readJobBrief } from './utils/coverLetter';
import {
  FileText,
  FileUp,
  Columns,
  Edit3,
  Eye,
  Palette,
  Globe,
  ShieldCheck,
  Sparkles,
  Command,
  GitBranch,
} from 'lucide-react';

const DEFAULT_STYLES = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  lineHeight: 1.48,
  primaryColor: '#1e293b',
  textColor: '#1e293b',
  subtextColor: '#475569',
  borderStyle: 'line',
  bulletStyle: '•',
  marginY: 24,
  marginX: 28,
  sectionGap: 16,
  itemGap: 10,
};

const TEMPLATE_LABEL_KEYS = {
  'ats-classic': 'classicATS',
  'modern-executive': 'modernExec',
  'technical-compact': 'compactTech',
  'elegant-serif': 'serifPremium',
  'creative-split': 'creativeSplit',
  'minimal-clean': 'minimalClean',
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [lang, setLang] = useState(() => localStorage.getItem('downcv_lang') || 'en');
  const t = translations[lang] || translations.en;

  useEffect(() => {
    localStorage.setItem('downcv_lang', lang);
  }, [lang]);

  const [firstDocument] = useState(() => defaultSample(lang));
  const { markdown, setMarkdown, undo, redo, canUndo, canRedo } = useMarkdownHistory(
    firstDocument.markdown,
  );
  const [lastSavedMarkdown, setLastSavedMarkdown] = useState(firstDocument.markdown);

  const [savedDrafts, setSavedDrafts] = useLocalStorage('drafts', []);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [currentDraftName, setCurrentDraftName] = useState('');
  const [viewMode, setViewMode] = useState('split');
  const [activeSidebar, setActiveSidebar] = useState('styles');
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [tourDone, setTourDone] = useLocalStorage('tour_done', false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (!tourDone) {
      setTourOpen(true);
    }
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    setTourDone(true);
  }, []);
  const [aiSettings, setAiSettings] = useLocalStorage('ai_settings', {
    enabled: false,
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: 'llama3',
    apiKey: '',
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const resetStyles = () => setStyles(DEFAULT_STYLES);

  useEffect(() => {
    try {
      localStorage.setItem('downcv_drafts', JSON.stringify(savedDrafts));
    } catch (e) {}
  }, [savedDrafts]);

  const isUnsaved = markdown !== lastSavedMarkdown;

  const localFile = useLocalFile({
    onRead: (text) => {
      setMarkdown(text);
      setLastSavedMarkdown(text);
      setCurrentDraftId(null);
      setCurrentDraftName('');
    },
    onError: () => setFileNotice(t.localFileError),
  });
  const [fileNotice, setFileNotice] = useState(null);

  useEffect(() => {
    if (fileNotice) {
      const timer = setTimeout(() => setFileNotice(null), 6000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [fileNotice]);

  const markDirtyRef = useRef(localFile.markDirty);
  markDirtyRef.current = localFile.markDirty;

  useEffect(() => {
    if (isUnsaved) {
      markDirtyRef.current();
    }
  }, [isUnsaved]);

  const handleSaveDraft = (name) => {
    const now = new Date().toISOString();
    let draftId = currentDraftId;
    if (!draftId) {
      draftId = 'draft_' + Date.now();
      setCurrentDraftId(draftId);
    }
    const newDraft = { id: draftId, name, markdown, updatedAt: now };
    setSavedDrafts((prev) => {
      const exists = prev.some((d) => d.id === draftId);
      return exists ? prev.map((d) => (d.id === draftId ? newDraft : d)) : [newDraft, ...prev];
    });
    setCurrentDraftName(name);
    setLastSavedMarkdown(markdown);

    if (localFile.isLinked) {
      localFile.save(markdown, { silent: true });
    }
  };

  const handleSelectSample = (value) => {
    if (!value) {
      return;
    }
    if (value.startsWith('draft:')) {
      const id = value.replace('draft:', '');
      const found = savedDrafts.find((d) => d.id === id);
      if (found) {
        setMarkdown(found.markdown);
        setLastSavedMarkdown(found.markdown);
        setCurrentDraftId(found.id);
        setCurrentDraftName(found.name);
      }
    } else if (value.startsWith('sample:')) {
      const id = value.replace('sample:', '');
      const found = sampleCVs.find((s) => s.id === id);
      if (found) {
        setMarkdown(found.markdown);
        setLastSavedMarkdown(found.markdown);
        setCurrentDraftId(null);
        setCurrentDraftName(found.name);
      }
    }
  };

  const [atsHistory, setAtsHistory] = useLocalStorage('ats_pdf_history', []);
  const latestAts = atsHistory[0] || null;
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const readPreviewPageCount = useCallback((count) => setPreviewPageCount(count), []);
  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;

  const contactCheck = useContactVerification(markdown);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [heldExport, setHeldExport] = useState(null);
  const requestExport = useCallback(
    (action) => {
      if (contactCheck.pending.length > 0) {
        setHeldExport(() => action);
        return false;
      }

      return action();
    },
    [contactCheck.pending.length],
  );

  function printNow() {
    setViewMode('preview');
    setPendingPrint(true);
  }

  function handlePrint() {
    return requestExport(printNow);
  }

  const exportDocx = () =>
    requestExport(async () => {
      const { generateDOCX } = await import('./utils/docxGenerator');
      const done = await generateDOCX(markdown, styles, exportFilename(markdown, 'docx'));
      if (!done) {
        throw new Error(t.atsOfficeError);
      }
      return true;
    });

  const exportRtf = () =>
    requestExport(async () => {
      const { generateRTF } = await import('./utils/docxGenerator');
      return generateRTF(markdown, styles, exportFilename(markdown, 'rtf'));
    });

  const exportPng = () =>
    requestExport(async () => {
      const { exportToPng } = await import('./utils/pngExport');
      return exportToPng('.cv-page .cv-paper', markdown);
    });

  const exportJsonResume = () =>
    requestExport(async () => {
      const { markdownToJsonResume } = await import('./utils/jsonResume');
      const json = markdownToJsonResume(markdown);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const filename = exportFilename(markdown, 'json');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    });

  const exportPortfolio = () =>
    requestExport(async () => {
      const { exportToPortfolioHtml } = await import('./utils/portfolioExport');
      return exportToPortfolioHtml(markdown);
    });

  const markdownRef = useRef(markdown);
  const stylesRef = useRef(styles);
  markdownRef.current = markdown;
  stylesRef.current = styles;

  const fitToOnePage = useCallback(async () => {
    const { fitToPages } = await import('./utils/pdfBuilder');
    const result = fitToPages(markdownRef.current, stylesRef.current, {
      bullet: stylesRef.current.bulletStyle,
      targetPages: 1,
    });
    if (!result.changed) {
      return false;
    }
    setStyles((previous) => ({
      ...previous,
      fontSize: result.styles.fontSize,
      lineHeight: result.styles.lineHeight,
      marginX: result.styles.marginX,
      marginY: result.styles.marginY,
      sectionGap: result.styles.sectionGap,
      itemGap: result.styles.itemGap,
    }));
    return result.reached;
  }, []);

  useEffect(() => {
    if (!pendingPrint) {
      return;
    }
    setPendingPrint(false);
    window.print();
  }, [pendingPrint, viewMode]);

  useKeyboardShortcuts({
    onSave: () => handleSaveDraft(currentDraftName || 'My ATS CV'),
    onPrint: handlePrint,
    onUndo: undo,
    onRedo: redo,
    onCommandPalette: () => setPaletteOpen((value) => !value),
  });

  const [sync, setSync] = useState({ editor: null, preview: null });
  const syncNonce = useRef(0);
  const syncPausedUntil = useRef(0);

  const ask = useCallback(
    (from) => (ratio) => {
      if (Date.now() < syncPausedUntil.current) {
        return;
      }
      syncNonce.current += 1;
      setSync((previous) => ({
        ...previous,

        editor:
          from === 'preview'
            ? {
                offset: offsetAtRatio(markdownRef.current, ratio),
                nonce: syncNonce.current,
                source: markdownRef.current,
              }
            : null,
        preview:
          from === 'editor'
            ? {
                offset: offsetAtRatio(markdownRef.current, ratio),
                nonce: syncNonce.current,
                source: markdownRef.current,
              }
            : null,
      }));
    },
    [],
  );

  const editorSync = useMemo(() => ask('editor'), [ask]);
  const previewSync = useMemo(() => ask('preview'), [ask]);

  useEffect(() => {
    if (!sync.editor) {
      return undefined;
    }
    const timer = setTimeout(() => {
      syncPausedUntil.current = Date.now() + SYNC_LOCK_MS;
    }, 60);
    return () => clearTimeout(timer);
  }, [sync.editor]);

  useEffect(() => {
    if (!sync.preview) {
      return undefined;
    }
    const timer = setTimeout(() => {
      syncPausedUntil.current = Date.now() + SYNC_LOCK_MS;
    }, 60);
    return () => clearTimeout(timer);
  }, [sync.preview]);

  const [cursor, setCursor] = useState(null);
  const cursorNonce = useRef(0);
  const cursorOffsetRef = useRef(undefined);
  const reportCursor = useCallback((offset) => {
    const normalized = offset === null || offset === undefined ? null : offset;
    if (normalized === cursorOffsetRef.current) {
      return;
    }
    cursorOffsetRef.current = normalized;
    cursorNonce.current += 1;
    setCursor(normalized === null ? null : { offset: normalized, nonce: cursorNonce.current });
  }, []);

  const editorSyncRequest = useMemo(
    () => (sync.editor && sync.editor.source === markdown ? sync.editor : null),
    [sync.editor, markdown],
  );
  const previewSyncRequest = useMemo(
    () => (sync.preview && sync.preview.source === markdown ? sync.preview : null),
    [sync.preview, markdown],
  );

  const [variants, setVariants] = useLocalStorage('cv_variants', []);
  const [activeVariantId, setActiveVariantId] = useState(null);

  const openVariant = useCallback(
    (id, content) => {
      const found = variants.find((variant) => variant.id === id);
      const text = content ?? found?.markdown;
      if (text === undefined) {
        return;
      }
      setMarkdown(text);
      setLastSavedMarkdown(text);
      setActiveVariantId(id);
      setCurrentDraftId(null);
      setCurrentDraftName(found?.name || '');
    },
    [variants, setMarkdown],
  );

  const saveVariant = useCallback(
    (id) => {
      setVariants((previous) =>
        previous.map((variant) =>
          variant.id === id
            ? { ...variant, markdown: markdownRef.current, updatedAt: new Date().toISOString() }
            : variant,
        ),
      );
    },
    [setVariants],
  );

  const storedVariant = variants.find((variant) => variant.id === activeVariantId);
  const variantIsDirty = Boolean(storedVariant && storedVariant.markdown !== markdown);

  const [jobBrief, setJobBrief] = useState('');
  const [letterJob, setLetterJob] = useState(null);

  const openLetterForJob = useCallback(({ jobDescription, jobMatch }) => {
    const brief = readJobBrief(jobDescription);
    setLetterJob({ jobDescription, jobMatch, role: brief.role, company: brief.company });
    setLetterOpen(true);
  }, []);

  const paletteActions = useMemo(
    () => ({
      theme,
      lang,
      templateName: (id) => t[TEMPLATE_LABEL_KEYS[id]] || id,
      exportPdf: handlePrint,
      exportDocx,
      exportRtf,
      exportPng,
      exportJson: exportJsonResume,
      exportPortfolio,
      setViewMode,
      setActiveSidebar,
      fitToOnePage,
      openAi: () => setAiOpen(true),
      retakeTour: () => setTourOpen(true),
      openImport: () => setImportOpen(true),
      openLetter: () => {
        setLetterJob(null);
        setLetterOpen(true);
      },
      saveDraft: () => handleSaveDraft(currentDraftName || 'My ATS CV'),
      openLocalFile: () => localFile.link(),
      saveLocalFile: () => localFile.save(markdownRef.current),
      toggleTheme,
      setLang,
      applyPreset: (id) => setStyles((previous) => applyTemplate(previous, id)),
    }),
    [
      theme,
      lang,
      t,
      fitToOnePage,
      toggleTheme,
      exportDocx,
      exportRtf,
      exportPng,
      exportJsonResume,
      exportPortfolio,
      localFile,
      currentDraftName,
    ],
  );

  const viewButtons = [
    { id: 'split', label: t.splitView, icon: Columns },
    { id: 'editor', label: t.editorView, icon: Edit3 },
    { id: 'preview', label: t.previewView, icon: Eye },
  ];

  const headerRef = useRef(null);
  const brandRef = useRef(null);
  const brandTextRef = useRef(null);
  const switchRef = useRef(null);
  const actionsRef = useRef(null);
  const [switchCentered, setSwitchCentered] = useState(false);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const check = () => {
      const header = headerRef.current;
      const brand = brandRef.current;
      const brandText = brandTextRef.current;
      const box = switchRef.current;
      const actions = actionsRef.current;
      if (!header || !brand || !box || !actions || box.offsetWidth === 0) {
        return;
      }
      const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const centre = header.clientWidth / 2 - 10 * rootFont;
      const half = box.offsetWidth / 2;
      const paddingRight = parseFloat(getComputedStyle(header).paddingRight) || 0;
      const brandTextWidth = brandText
        ? Math.max(0, ...[...brandText.children].map((child) => child.scrollWidth))
        : 0;
      const brandMinRight = brand.offsetLeft + 48 + brandTextWidth;
      const actionsLeft = header.clientWidth - paddingRight - actions.offsetWidth;
      const fits = centre - half > brandMinRight + 8 && centre + half < actionsLeft - 8;
      setSwitchCentered((previous) => (previous === fits ? previous : fits));
    };
    check();
    const observer = new ResizeObserver(check);
    [headerRef, brandRef, brandTextRef, switchRef, actionsRef].forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden bg-[var(--ui-bg-primary)] font-sans text-[var(--ui-text-primary)]">
      <header
        ref={headerRef}
        className="relative min-h-14 shrink-0 gap-x-3 gap-y-1 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-3 no-print sm:px-4 flex items-center flex-wrap py-1"
      >
        <div ref={brandRef} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="app-brand-icon flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
            <img src="/icon.jpg" alt="DownCV" className="h-full w-full object-cover" />
          </div>
          <div ref={brandTextRef} className="min-w-0">
            <h1 className="truncate whitespace-nowrap text-base font-bold tracking-tight text-[var(--ui-text-primary)]">
              {t.appTitle}
            </h1>
            <p className="hidden truncate whitespace-nowrap text-[11px] text-[var(--ui-text-tertiary)] sm:block">
              {t.appTagline}
            </p>
          </div>
        </div>

        <div
          ref={switchRef}
          className={`topbar-switch grid shrink-0 grid-cols-3 items-center gap-0.5 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-1 text-xs ${switchCentered ? 'topbar-switch-centered' : ''} ${switchCentered ? '' : 'topbar-switch-flow'}`}
        >
          {viewButtons.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                title={v.label}
                className={`flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 font-medium transition ${
                  viewMode === v.id
                    ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)]'
                    : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />{' '}
                <span className="hidden lg:inline">{v.label}</span>
              </button>
            );
          })}
        </div>

        <div ref={actionsRef} className="flex shrink-0 items-center justify-end gap-2">
          <button
            data-tour="palette"
            onClick={() => setPaletteOpen(true)}
            title={`${t.cmdTitle} (Ctrl+K)`}
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--ui-text-tertiary)] transition hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
          >
            <Command className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[1700px]:inline">{t.cmdTitle}</span>
            <kbd className="rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-1 font-mono text-[10px]">
              K
            </kbd>
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-1 text-xs">
            <button
              onClick={() => setActiveSidebar('styles')}
              title={t.stylesTab}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 font-medium transition ${
                activeSidebar === 'styles'
                  ? 'bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]'
                  : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />{' '}
              <span className="hidden min-[1700px]:inline">{t.stylesTab}</span>
            </button>
            <button
              onClick={() => setActiveSidebar('ats')}
              title={t.atsScoreTab}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 font-medium transition ${
                activeSidebar === 'ats'
                  ? 'bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]'
                  : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />{' '}
              <span className="hidden min-[1700px]:inline">{t.atsScoreTab}</span>
              {latestAts ? (
                <span
                  className={`shrink-0 rounded px-1.5 font-mono text-[10px] ${
                    latestAts.score >= 80
                      ? 'bg-emerald-950 text-emerald-400'
                      : 'bg-amber-950 text-amber-400'
                  }`}
                >
                  {latestAts.score}%
                </span>
              ) : (
                <span className="shrink-0 rounded bg-[var(--ui-bg-badge)] px-1.5 font-mono text-[10px] text-[var(--ui-text-tertiary)]">
                  PDF
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSidebar('variants')}
              title={t.variantsTab}
              className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 font-medium transition ${
                activeSidebar === 'variants'
                  ? 'bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]'
                  : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0" />{' '}
              <span className="hidden min-[1700px]:inline">{t.variantsTab}</span>
              {variantIsDirty && (
                <span
                  className="shrink-0 rounded bg-amber-950 px-1.5 font-mono text-[10px] text-amber-400"
                  title={t.variantsUnsaved}
                >
                  *
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              data-tour="ai"
              onClick={() => setAiOpen(true)}
              title={t.aiAssistantTitle}
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--ui-accent)]/30 bg-[var(--ui-accent-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-accent)] hover:text-[var(--ui-text-inverse)]"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />{' '}
              <span className="hidden min-[1700px]:inline">{t.aiAssistantTitle}</span>
            </button>
            <button
              onClick={() => setImportOpen(true)}
              title={t.importTitle}
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--ui-text-tertiary)] transition hover:border-[var(--ui-accent-border)] hover:text-[var(--ui-accent)]"
            >
              <FileUp className="w-3.5 h-3.5 shrink-0" />{' '}
              <span className="hidden min-[1700px]:inline">{t.importTitle}</span>
            </button>
            <button
              onClick={() => {
                setLetterJob(null);
                setLetterOpen(true);
              }}
              title={t.letterTitle}
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--ui-text-tertiary)] transition hover:border-[var(--ui-accent-border)] hover:text-[var(--ui-accent)]"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />{' '}
              <span className="hidden min-[1700px]:inline">{t.letterTitle}</span>
            </button>
          </div>

          <ExportMenu
            t={t}
            onPdf={handlePrint}
            onDocx={exportDocx}
            onRtf={exportRtf}
            onPng={exportPng}
            onJson={exportJsonResume}
            onPortfolio={exportPortfolio}
          />

          <div className="flex items-center gap-1 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] p-1 text-xs">
            {['en', 'es'].map((code) => {
              const isActive = lang === code;
              return (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  aria-pressed={isActive}
                  title={t[`lang${code.toUpperCase()}`]}
                  className={`flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2 py-1 font-semibold transition ${
                    isActive
                      ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)]'
                      : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>

          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      {fileNotice && (
        <p className="shrink-0 border-b border-amber-500/30 bg-amber-950/40 px-4 py-1.5 text-[11px] text-amber-300 no-print">
          {fileNotice}
        </p>
      )}

      <ContactWarnings
        markdown={markdown}
        t={t}
        open={contactsOpen}
        onOpenChange={setContactsOpen}
      />

      <div className="app-main flex flex-1 overflow-hidden">
        <div className="app-main flex flex-1 overflow-hidden">
          {(viewMode === 'split' || viewMode === 'editor') && (
            <div
              data-tour="editor"
              className={`h-full ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}
            >
              <MarkdownEditor
                markdown={markdown}
                setMarkdown={setMarkdown}
                sampleCVs={samplesFor(lang)}
                lang={lang}
                onSelectSample={handleSelectSample}
                wordCount={wordCount}
                savedDrafts={savedDrafts}
                onSaveDraft={handleSaveDraft}
                isUnsaved={isUnsaved}
                currentDraftName={currentDraftName}
                t={t}
                searchOpen={searchOpen}
                setSearchOpen={setSearchOpen}
                onScrollRatio={editorSync}
                syncRequest={editorSyncRequest}
                onCursorOffset={reportCursor}
              />
            </div>
          )}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div
              data-tour="preview"
              className={`h-full ${viewMode === 'split' ? 'w-1/2 border-l border-[var(--ui-border-primary)]' : 'w-full'}`}
            >
              <CVPreview
                markdown={markdown}
                setMarkdown={setMarkdown}
                styles={styles}
                t={t}
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                onScrollRatio={previewSync}
                syncRequest={previewSyncRequest}
                cursorRequest={cursor}
                lang={lang}
                aiEnabled={aiSettings.enabled}
                aiSettings={aiSettings}
                onPageCount={readPreviewPageCount}
              />
            </div>
          )}
        </div>
        <div data-tour="sidebar" className="app-sidebar h-full shrink-0 overflow-y-auto no-print">
          {activeSidebar === 'styles' ? (
            <StyleControls styles={styles} setStyles={setStyles} resetStyles={resetStyles} t={t} />
          ) : activeSidebar === 'variants' ? (
            <VariantsPanel
              markdown={markdown}
              variants={variants}
              setVariants={setVariants}
              activeVariantId={activeVariantId}
              onOpenVariant={openVariant}
              onSaveCurrent={saveVariant}
              t={t}
              localFile={localFile}
            />
          ) : (
            <ATSAnalyzer
              markdown={markdown}
              styles={styles}
              setStyles={setStyles}
              setMarkdown={setMarkdown}
              t={t}
              lang={lang}
              history={atsHistory}
              setHistory={setAtsHistory}
              previewPageCount={previewPageCount}
              jobBrief={jobBrief}
              onJobBriefChange={setJobBrief}
              onRequestLetter={openLetterForJob}
            />
          )}
        </div>
      </div>

      <CoverLetterModal
        open={letterOpen}
        onClose={() => {
          setLetterOpen(false);
          setLetterJob(null);
        }}
        onRequestExport={requestExport}
        markdown={markdown}
        styles={styles}
        t={t}
        lang={lang}
        job={letterJob}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={setMarkdown}
        t={t}
        lang={lang}
        isUnsaved={isUnsaved}
      />

      <AIAssistantModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        settings={aiSettings}
        onSettingsChange={setAiSettings}
        lang={lang}
      />

      <AppTour open={tourOpen} t={t} onDone={closeTour} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
        t={t}
      />

      <ConfirmDialog
        open={heldExport !== null}
        title={t.exportBlockedTitle}
        message={`${t.exportBlockedMessage} ${contactCheck.pending.length} ${t.contactWarningPending}.`}
        detail={t.exportBlockedDetail}
        confirmLabel={t.exportBlockedGo}
        cancelLabel={t.cancel}
        onConfirm={() => {
          setContactsOpen(true);
          setHeldExport(null);
        }}
        onCancel={() => setHeldExport(null)}
      />
    </div>
  );
}
