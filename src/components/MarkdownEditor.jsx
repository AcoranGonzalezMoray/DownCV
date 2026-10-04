import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCode,
  Download,
  Upload,
  Copy,
  Save,
  Check,
  PlusCircle,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  Code,
  BookOpen,
  Award,
  Link2,
  FolderOpen,
  BarChart3,
  Target,
  Building2,
} from 'lucide-react';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import { applyInlineFormat } from '../utils/markdownFormat';
import { insertSection } from '../utils/insertSection';
import { snippet } from '../data/snippets';
import {
  insideSkillsSection,
  partialWordAt,
  skillsInUse,
  suggestSkills,
} from '../utils/skillSuggestions';
import { ratioAtOffset, scrollRatio } from '../utils/scrollSync';

const SAMPLE_ICONS = {
  code: Code,
  chart: BarChart3,
  target: Target,
  building: Building2,
};

export default function MarkdownEditor({
  markdown,
  setMarkdown,
  sampleCVs,
  onSelectSample,
  wordCount,
  savedDrafts,
  onSaveDraft,
  currentDraftName,
  t,
  searchOpen,
  setSearchOpen,
  lang = 'en',
  syncRequest = null,
  onScrollRatio = null,
  onCursorOffset = null,
}) {
  const fileInputRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const pendingSelection = useRef(null);
  const [copied, setCopied] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const syncPausedUntil = useRef(0);

  useEffect(() => {
    const pending = pendingSelection.current;
    if (!pending) {
      return;
    }
    pendingSelection.current = null;
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus();
    textarea.setSelectionRange(pending.start, pending.end);
  }, [markdown]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const query = searchQuery.toLowerCase();
    const text = markdown.toLowerCase();
    const foundIndices = [];
    let pos = text.indexOf(query);
    while (pos !== -1) {
      foundIndices.push(pos);
      pos = text.indexOf(query, pos + 1);
    }
    setMatches(foundIndices);
    setCurrentMatchIndex(0);
  }, [searchQuery, markdown]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleDownloadMD = () => {
    const element = document.createElement('a');
    const file = new Blob([markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${(currentDraftName || 'CV_ATS').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setMarkdown(event.target.result);
    reader.readAsText(file);
  };
  const openSaveModal = () => {
    setDraftNameInput(currentDraftName || 'My ATS CV');
    setShowSaveModal(true);
  };
  const handleConfirmSave = (e) => {
    e.preventDefault();
    if (!draftNameInput.trim()) {
      return;
    }
    onSaveDraft(draftNameInput.trim());
    setShowSaveModal(false);
  };
  const insertSnippet = (id) => {
    const block = snippet(id, lang);
    if (!block) {
      return;
    }
    const textarea = textareaRef.current;

    const caret = document.activeElement === textarea ? textarea.selectionStart : markdown.length;
    const result = insertSection(markdown, block, caret);
    if (!result) {
      return;
    }
    pendingSelection.current = { start: result.caret, end: result.caret };
    setMarkdown(result.markdown);
  };

  const snippets = [
    { id: 'experience', label: t.expSnippetLabel, hint: t.expSnippetHint, icon: FileText },
    { id: 'education', label: t.eduSnippetLabel, hint: t.eduSnippetHint, icon: BookOpen },
    { id: 'skills', label: t.skillsSnippetLabel, hint: t.skillsSnippetHint, icon: Code },
    { id: 'certification', label: t.certSnippetLabel, hint: t.certSnippetHint, icon: Award },
  ];

  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryRef = useRef(null);
  const libraryButtonRef = useRef(null);

  const libraryItems = [
    ...savedDrafts.map((draft) => ({
      key: `draft:${draft.id}`,
      label: draft.name,
      hint: t.saved,
      icon: FileText,
      group: t.savedDraftsGroup,
    })),
    ...sampleCVs.map((sample) => ({
      key: `sample:${sample.id}`,
      label: sample.name,
      hint: sample.category,
      icon: SAMPLE_ICONS[sample.icon] || FileText,
      group: t.sampleTemplatesGroup,
    })),
  ];

  useEffect(() => {
    if (!libraryOpen) {
      return undefined;
    }
    const onPointerDown = (event) => {
      if (!libraryRef.current?.contains(event.target)) {
        setLibraryOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLibraryOpen(false);
        libraryButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [libraryOpen]);

  const pickFromLibrary = (key) => {
    setLibraryOpen(false);
    libraryButtonRef.current?.focus();
    onSelectSample(key);
  };

  const onLibraryKeyDown = (event) => {
    const last = libraryItems.length - 1;
    const current = libraryItems.findIndex((item) => item.key === event.currentTarget.dataset.key);
    let next = null;
    if (event.key === 'ArrowDown') {
      next = current >= last ? 0 : current + 1;
    } else if (event.key === 'ArrowUp') {
      next = current <= 0 ? last : current - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = last;
    }
    if (next === null) {
      return;
    }
    event.preventDefault();
    libraryRef.current?.querySelectorAll('[role="menuitem"]')[next]?.focus();
  };

  const formatSelection = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (end <= start) {
      return;
    }
    const result = applyInlineFormat(markdown, { start, end }, type);
    if (!result) {
      return;
    }
    pendingSelection.current = result.range;
    setMarkdown(result.markdown);
  };

  useKeyboardShortcuts({
    onBold: () => formatSelection('bold'),
    onItalic: () => formatSelection('italic'),
    onSearch: () => setSearchOpen(!searchOpen),
  });

  useEffect(() => {
    if (!syncRequest) {
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const ratio = ratioAtOffset(markdown, syncRequest.offset);
    const scrollable = textarea.scrollHeight - textarea.clientHeight;
    if (scrollable > 0) {
      syncPausedUntil.current = Date.now() + 400;
      textarea.scrollTop = Math.round(ratio * scrollable);
    }
  }, [syncRequest, markdown]);

  const cursorFrame = useRef(0);
  const reportCursor = useCallback(
    (offset) => {
      if (!onCursorOffset) {
        return;
      }
      cancelAnimationFrame(cursorFrame.current);
      cursorFrame.current = requestAnimationFrame(() => onCursorOffset(offset));
    },
    [onCursorOffset],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(cursorFrame.current);
    },
    [],
  );

  const reportScroll = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onScrollRatio) {
      return;
    }
    if (Date.now() < syncPausedUntil.current) {
      return;
    }
    onScrollRatio(scrollRatio(textarea.scrollTop, textarea.scrollHeight, textarea.clientHeight));
  }, [onScrollRatio]);

  const refreshSuggestions = useCallback((text, caret) => {
    if (!insideSkillsSection(text, caret)) {
      setSuggestions([]);
      return;
    }
    const { word } = partialWordAt(text, caret);
    if (word.length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestions(suggestSkills(word, { exclude: skillsInUse(text) }));
    setSuggestionIndex(0);
  }, []);

  const acceptSuggestion = useCallback(
    (name) => {
      const textarea = textareaRef.current;
      const caret = textarea?.selectionStart ?? markdown.length;
      const { start } = partialWordAt(markdown, caret);

      const line = markdown.slice(markdown.lastIndexOf('\n', start - 1) + 1, start);
      const separator = line.includes(',') && !/[,;|]\s*$/.test(line) ? ', ' : '';
      const inserted = `${separator}${name}, `;
      const caretAfter = start + inserted.length;
      pendingSelection.current = { start: caretAfter, end: caretAfter };
      setMarkdown(markdown.slice(0, start) + inserted + markdown.slice(caret));
      setSuggestions([]);
    },
    [markdown, setMarkdown],
  );

  const handleKeyDown = (event) => {
    if (suggestions.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSuggestionIndex((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
      event.preventDefault();
      acceptSuggestion(suggestions[suggestionIndex].name);
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      setSuggestions([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--ui-bg-primary)] border-r border-[var(--ui-border-primary)] relative">
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-[var(--ui-bg-overlay)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--ui-bg-card)] border border-[var(--ui-border-primary)] rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-[var(--ui-text-primary)] text-sm flex items-center gap-2">
              <Save className="w-4 h-4 text-[var(--ui-accent)]" /> {t.saveModalTitle}
            </h3>
            <form onSubmit={handleConfirmSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--ui-text-secondary)] block mb-1">
                  {t.saveModalLabel}
                </label>
                <input
                  type="text"
                  value={draftNameInput}
                  onChange={(e) => setDraftNameInput(e.target.value)}
                  placeholder="e.g. Senior Software Engineer CV"
                  className="app-input w-full text-xs p-2.5 rounded"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 text-xs text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-bg-card)] rounded transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-[var(--ui-text-inverse)] bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)] font-semibold rounded shadow transition"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-3 bg-[var(--ui-bg-tertiary)] border-b border-[var(--ui-border-primary)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-[var(--ui-accent)]" />
          <span className="font-semibold text-[var(--ui-text-secondary)] text-sm truncate max-w-[120px] sm:max-w-[180px]">
            {currentDraftName || t.markdownEditor}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--ui-bg-badge)] text-[var(--ui-text-tertiary)] font-mono">
            {wordCount} {t.words}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`p-1.5 rounded border transition flex items-center gap-1 text-xs ${searchOpen ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)]' : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] border-[var(--ui-border-primary)]'}`}
            title={t.searchPlaceholder}
          >
            <Search className="w-4 h-4" /> <span className="hidden sm:inline">Search</span>
          </button>
          <div className="relative" ref={libraryRef}>
            <button
              type="button"
              ref={libraryButtonRef}
              onClick={() => setLibraryOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={libraryOpen}
              title={t.openDraftOrSample}
              className="flex items-center gap-1.5 bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-tertiary)] text-xs font-medium text-[var(--ui-text-secondary)] py-1.5 px-2.5 rounded border border-[var(--ui-border-primary)] transition hover:border-[var(--ui-accent)]/50"
            >
              <FolderOpen className="w-4 h-4 text-[var(--ui-accent)] shrink-0" />
              <span className="max-w-[120px] truncate">{t.openDraftOrSample}</span>
              {libraryOpen ? (
                <ChevronUp className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 shrink-0" />
              )}
            </button>

            {libraryOpen && (
              <div
                role="menu"
                aria-label={t.openDraftOrSample}
                className="absolute right-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-xl overflow-hidden"
              >
                {[t.savedDraftsGroup, t.sampleTemplatesGroup]
                  .filter((group) => libraryItems.some((item) => item.group === group))
                  .map((group) => (
                    <div key={group} className="py-1">
                      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)]">
                        {group}
                      </p>
                      {libraryItems
                        .filter((item) => item.group === group)
                        .map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              role="menuitem"
                              data-key={item.key}
                              onKeyDown={onLibraryKeyDown}
                              onClick={() => pickFromLibrary(item.key)}
                              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-[var(--ui-accent-muted)] focus:outline-none focus:bg-[var(--ui-accent-muted)]"
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--ui-accent)]" />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-medium text-[var(--ui-text-primary)]">
                                  {item.label}
                                </span>
                                <span className="block truncate text-[10px] text-[var(--ui-text-tertiary)]">
                                  {item.hint}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <button
            onClick={openSaveModal}
            className="relative p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-badge)] hover:bg-[var(--ui-bg-tertiary)] rounded border border-[var(--ui-border-primary)] transition flex items-center gap-1 text-xs px-2"
          >
            <Save className="w-4 h-4 text-[var(--ui-accent)]" />{' '}
            <span className="hidden sm:inline font-medium">{t.save}</span>
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-tertiary)] rounded border border-[var(--ui-border-primary)] transition"
            title={copied ? 'Copied!' : 'Copy Markdown'}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownloadMD}
            className="p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-tertiary)] rounded border border-[var(--ui-border-primary)] transition"
            title="Download .md file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-tertiary)] rounded border border-[var(--ui-border-primary)] transition"
            title="Import .md file"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".md,.txt"
            className="hidden"
          />
        </div>
      </div>

      {searchOpen && (
        <div className="px-3 py-2 bg-[var(--ui-bg-tertiary)] border-b border-[var(--ui-border-accent)] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--ui-accent)] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="app-input text-xs px-2.5 py-1 rounded border border-[var(--ui-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)] w-full max-w-xs"
              autoFocus
            />
            {searchQuery && (
              <span className="text-[11px] font-mono text-[var(--ui-text-tertiary)]">
                {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '0'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
              }}
              disabled={matches.length === 0}
              className="p-1 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] disabled:opacity-30 bg-[var(--ui-bg-card)] rounded border border-[var(--ui-border-primary)]"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
              }}
              disabled={matches.length === 0}
              className="p-1 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] disabled:opacity-30 bg-[var(--ui-bg-card)] rounded border border-[var(--ui-border-primary)]"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="px-3 py-1.5 bg-[var(--ui-bg-secondary)] border-b border-[var(--ui-border-primary)] flex items-center gap-1.5 overflow-x-auto text-xs">
        <span className="text-[var(--ui-text-muted)] font-medium flex items-center gap-1 shrink-0">
          <PlusCircle className="w-3.5 h-3.5" /> {t.insertSnippet}
        </span>
        {snippets.map((snip) => {
          const Icon = snip.icon;
          return (
            <button
              key={snip.id}
              onClick={() => insertSnippet(snip.id)}
              title={snip.hint}
              className="px-2 py-1 rounded bg-[var(--ui-bg-card)] hover:bg-[var(--ui-accent-muted)] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] border border-[var(--ui-border-primary)] transition shrink-0 flex items-center gap-1"
            >
              <Icon className="w-3 h-3" />
              {snip.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          aria-label={t.markdownEditor}
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value, true);
            refreshSuggestions(e.target.value, e.target.selectionStart);
            reportCursor(e.target.selectionStart);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => reportCursor(e.target.selectionStart)}
          onScroll={reportScroll}
          onBlur={() => {
            cancelAnimationFrame(cursorFrame.current);
            if (onCursorOffset) {
              onCursorOffset(null);
            }
          }}
          onClick={(e) => {
            setSuggestions([]);
            reportCursor(e.target.selectionStart);
          }}
          placeholder="# Name\n**Professional Title**\n\nemail@example.com | +1 555 000 000 | City, Country..."
          className="editor-textarea w-full h-full p-4 bg-[var(--ui-bg-primary)] text-[var(--ui-text-primary)] font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none selection:bg-[var(--ui-selection-bg)] selection:text-[var(--ui-selection-text)]"
          spellCheck="false"
        />

        {suggestions.length > 0 && (
          <div className="absolute bottom-3 left-3 z-30 w-72 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-tertiary)] px-3 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                <Link2 className="h-3 w-3" />
              </span>
              <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                {t.skillsSuggestTitle}
              </span>
              <span className="rounded bg-[var(--ui-bg-badge)] px-1.5 font-mono text-[10px] text-[var(--ui-text-tertiary)]">
                {suggestions.length}
              </span>
            </div>

            <ul role="listbox" aria-label={t.skillsSuggestTitle}>
              {suggestions.map((entry, index) => (
                <li key={entry.name} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === suggestionIndex}
                    data-skill={entry.name}

                    onMouseDown={(event) => {
                      event.preventDefault();
                      acceptSuggestion(entry.name);
                    }}
                    onMouseEnter={() => setSuggestionIndex(index)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-[var(--ui-border-primary)] px-3 py-2 text-left text-[13px] transition last:border-b-0 ${
                      index === suggestionIndex
                        ? 'bg-[var(--ui-accent)] font-semibold text-[var(--ui-text-inverse)]'
                        : 'text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card-hover)]'
                    }`}
                  >
                    <span className="truncate">{entry.name}</span>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wide ${
                        index === suggestionIndex
                          ? 'text-[var(--ui-text-inverse)] opacity-75'
                          : 'text-[var(--ui-text-muted)]'
                      }`}
                    >
                      {entry.group}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="flex items-center justify-between gap-2 border-t border-[var(--ui-border-primary)] bg-[var(--ui-bg-tertiary)] px-3 py-1.5 text-[10px] text-[var(--ui-text-tertiary)]">
              <span>{t.skillsSuggestHint}</span>
              <span className="shrink-0 font-mono">Tab</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
