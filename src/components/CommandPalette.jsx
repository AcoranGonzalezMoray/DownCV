import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Printer,
  FileText,
  Image,
  Code,
  Globe,
  Sparkles,
  FileUp,
  Columns,
  Edit3,
  Eye,
  Palette,
  ShieldCheck,
  Moon,
  Sun,
  Wand2,
  FolderOpen,
  Save,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  GitBranch,
  FileSignature,
  BookOpen,
  Compass,
} from 'lucide-react';
import { LAYOUT_TEMPLATES } from '../data/templates';

export default function CommandPalette({ open, onClose, actions, t }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = [
    {
      id: 'pdf',
      title: t.cmdExportPdf,
      category: t.cmdExport,
      icon: Printer,
      action: actions.exportPdf,
    },
    {
      id: 'docx',
      title: t.cmdExportDocx,
      category: t.cmdExport,
      icon: FileText,
      action: actions.exportDocx,
    },
    {
      id: 'rtf',
      title: t.cmdExportRtf,
      category: t.cmdExport,
      icon: FileText,
      action: actions.exportRtf,
    },
    {
      id: 'png',
      title: t.cmdExportPng,
      category: t.cmdExport,
      icon: Image,
      action: actions.exportPng,
    },
    {
      id: 'json',
      title: t.cmdExportJson,
      category: t.cmdExport,
      icon: Code,
      action: actions.exportJson,
    },
    {
      id: 'portfolio',
      title: t.cmdExportPortfolio,
      category: t.cmdExport,
      icon: Globe,
      action: actions.exportPortfolio,
    },

    {
      id: 'view-split',
      title: t.cmdViewSplit,
      category: t.cmdView,
      icon: Columns,
      action: () => actions.setViewMode('split'),
    },
    {
      id: 'view-editor',
      title: t.cmdViewEditor,
      category: t.cmdView,
      icon: Edit3,
      action: () => actions.setViewMode('editor'),
    },
    {
      id: 'view-preview',
      title: t.cmdViewPreview,
      category: t.cmdView,
      icon: Eye,
      action: () => actions.setViewMode('preview'),
    },

    {
      id: 'sidebar-styles',
      title: t.cmdPanelStyles,
      category: t.cmdPanel,
      icon: Palette,
      action: () => actions.setActiveSidebar('styles'),
    },
    {
      id: 'sidebar-ats',
      title: t.cmdPanelAts,
      category: t.cmdPanel,
      icon: ShieldCheck,
      action: () => actions.setActiveSidebar('ats'),
    },
    {
      id: 'sidebar-variants',
      title: t.cmdPanelVariants,
      category: t.cmdPanel,
      icon: GitBranch,
      action: () => actions.setActiveSidebar('variants'),
    },

    {
      id: 'fit-page',
      title: t.cmdFitOnePage,
      category: t.cmdTools,
      icon: Wand2,
      action: actions.fitToOnePage,
    },
    {
      id: 'ai-modal',
      title: t.cmdOpenAi,
      category: t.cmdTools,
      icon: Sparkles,
      action: actions.openAi,
    },
    {
      id: 'import-modal',
      title: t.cmdOpenImport,
      category: t.cmdTools,
      icon: FileUp,
      action: actions.openImport,
    },
    {
      id: 'letter-modal',
      title: t.cmdOpenLetter,
      category: t.cmdTools,
      icon: FileSignature,
      action: actions.openLetter,
    },
    {
      id: 'save-draft',
      title: t.cmdSaveDraft,
      category: t.cmdTools,
      icon: BookOpen,
      action: actions.saveDraft,
    },
    {
      id: 'tour',
      title: t.cmdTour,
      category: t.cmdHelp,
      icon: Compass,
      action: actions.retakeTour,
    },

    {
      id: 'open-file',
      title: t.cmdOpenFile,
      category: t.cmdFiles,
      icon: FolderOpen,
      action: actions.openLocalFile,
    },
    {
      id: 'save-file',
      title: t.cmdSaveFile,
      category: t.cmdFiles,
      icon: Save,
      action: actions.saveLocalFile,
    },

    {
      id: 'toggle-theme',
      title: t.cmdToggleTheme,
      category: t.cmdSettings,
      icon: actions.theme === 'dark' ? Sun : Moon,
      action: actions.toggleTheme,
    },
    {
      id: 'toggle-lang',
      title: actions.lang === 'en' ? t.cmdLangToEs : t.cmdLangToEn,
      category: t.cmdSettings,
      icon: Globe,
      action: () => actions.setLang(actions.lang === 'en' ? 'es' : 'en'),
    },

    ...LAYOUT_TEMPLATES.map((template) => ({
      id: `preset-${template.id}`,
      title: `${t.cmdTemplate}: ${actions.templateName(template.id)}`,
      category: t.cmdTemplate,
      icon: Palette,
      action: () => actions.applyPreset(template.id),
    })),
  ].filter((item) => typeof item.action === 'function');

  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return true;
    }
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });

  const active = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    if (typeof selected?.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [active, filtered.length]);

  const run = (item) => {
    if (!item) {
      return;
    }
    onClose();
    item.action();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(filtered[active]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.cmdTitle}
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-4 py-3.5">
          <Search className="w-4 h-4 shrink-0 text-[var(--ui-accent)]" />
          <input
            ref={inputRef}
            type="text"
            aria-label={t.cmdSearch}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.cmdPlaceholder}
            className="flex-1 bg-transparent text-sm text-[var(--ui-text-primary)] placeholder-[var(--ui-text-tertiary)] focus:outline-none"
          />
          <kbd className="hidden px-1.5 py-0.5 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] font-mono text-[10px] text-[var(--ui-text-tertiary)] sm:inline-block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-[var(--ui-text-tertiary)]">{t.cmdEmpty}</p>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => run(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                    isSelected
                      ? 'bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]'
                      : 'text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card-hover)]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 opacity-80" />
                    <span className="truncate text-xs font-medium">{item.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--ui-text-tertiary)]">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3 h-3 text-[var(--ui-accent)]" />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] px-4 py-2 text-[11px] text-[var(--ui-text-tertiary)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" /> {t.cmdNavigate}
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> {t.cmdSelect}
            </span>
          </div>
          <span>Ctrl+K / Cmd+K</span>
        </div>
      </div>
    </div>
  );
}
