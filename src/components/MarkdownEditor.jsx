import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileCode,
  Download,
  Upload,
  Copy,
  Save,
  Check,
  PlusCircle,
  CheckCircle2,
  Contact,
  AlignLeft,
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
  FilePlus2,
  AlertTriangle,
  Trash2,
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
  onDeleteDraft = () => {},
  currentDraftId = null,
  currentDraftName,
  isUnsaved = false,
  t,
  searchOpen,
  setSearchOpen,
  lang = 'en',
  syncRequest = null,
  highlightRange = null,
  onScrollRatio = null,
  onCursorOffset = null,
}) {
  const fileInputRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const backdropRef = React.useRef(null);
  const pendingSelection = useRef(null);
  const pendingScroll = useRef(null);
  const caretRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [nameError, setNameError] = useState('');
  const isNameTaken = useCallback(
    (name) =>
      savedDrafts.some(
        (draft) =>
          draft.id !== (saveAsNew ? null : currentDraftId) &&
          String(draft.name ?? '')
            .trim()
            .toLocaleLowerCase() === name.toLocaleLowerCase(),
      ),
    [savedDrafts, currentDraftId, saveAsNew],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [snippetNotice, setSnippetNotice] = useState(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const syncPausedUntil = useRef(0);

  const previewHighlight = useMemo(() => {
    if (!highlightRange) {
      return null;
    }
    const start = Math.max(0, Math.min(Number(highlightRange.start) || 0, markdown.length));
    const end = Math.max(start, Math.min(Number(highlightRange.end) || 0, markdown.length));
    if (end <= start) {
      return null;
    }
    const focus = Math.max(start, Math.min(Number(highlightRange.focus) || start, end));
    return { start, end, focus };
  }, [highlightRange, markdown]);

  const syncBackdrop = useCallback(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;
    if (!textarea || !backdrop) {
      return;
    }
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }, []);

  useLayoutEffect(() => {
    syncBackdrop();
  });

  useEffect(() => {
    const updateScrollbarWidth = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        const diff = textarea.offsetWidth - textarea.clientWidth;
        setScrollbarWidth(diff > 0 ? diff : 0);
      }
    };
    updateScrollbarWidth();
    window.addEventListener('resize', updateScrollbarWidth);
    return () => window.removeEventListener('resize', updateScrollbarWidth);
  }, [markdown]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 30);
    }
  }, [searchOpen]);

  useEffect(() => {
    const pending = pendingSelection.current;
    if (!pending) {
      return undefined;
    }
    pendingSelection.current = null;
    const textarea = textareaRef.current;
    if (!textarea) {
      return undefined;
    }
    const scroll = pendingScroll.current;
    pendingScroll.current = null;
    caretRef.current = pending.start;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(pending.start, pending.end);
    if (!scroll) {
      return undefined;
    }
    const restore = () => {
      if (textarea.scrollTop !== scroll.top) {
        textarea.scrollTop = scroll.top;
      }
      if (textarea.scrollLeft !== scroll.left) {
        textarea.scrollLeft = scroll.left;
      }
      if (backdropRef.current) {
        backdropRef.current.scrollTop = textarea.scrollTop;
        backdropRef.current.scrollLeft = textarea.scrollLeft;
      }
    };
    restore();
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [markdown]);

  useEffect(() => {
    if (!snippetNotice) {
      return undefined;
    }
    const timer = setTimeout(() => setSnippetNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [snippetNotice]);

  const scrollToMatch = useCallback(
    (offset, length) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.setSelectionRange(offset, offset + length);
      const ratio = ratioAtOffset(markdown, offset);
      const scrollable = textarea.scrollHeight - textarea.clientHeight;
      if (scrollable > 0) {
        const targetScroll = Math.round(ratio * scrollable);
        const currentScroll = textarea.scrollTop;
        const viewHeight = textarea.clientHeight;
        if (targetScroll < currentScroll || targetScroll > currentScroll + viewHeight - 60) {
          textarea.scrollTop = Math.max(0, targetScroll - Math.round(viewHeight / 3));
        }
      }
      if (backdropRef.current) {
        backdropRef.current.scrollTop = textarea.scrollTop;
        backdropRef.current.scrollLeft = textarea.scrollLeft;
      }
    },
    [markdown],
  );

  const goToMatch = useCallback(
    (index) => {
      if (matches.length === 0) {
        return;
      }
      const newIndex = (index + matches.length) % matches.length;
      setCurrentMatchIndex(newIndex);
      const matchOffset = matches[newIndex];
      scrollToMatch(matchOffset, searchQuery.length);
    },
    [matches, searchQuery.length, scrollToMatch],
  );

  const goToNextMatch = useCallback(() => {
    goToMatch(currentMatchIndex + 1);
  }, [goToMatch, currentMatchIndex]);

  const goToPrevMatch = useCallback(() => {
    goToMatch(currentMatchIndex - 1);
  }, [goToMatch, currentMatchIndex]);

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
      pos = text.indexOf(query, pos + query.length);
    }
    setMatches(foundIndices);
    setCurrentMatchIndex(0);
    if (foundIndices.length > 0) {
      scrollToMatch(foundIndices[0], query.length);
    }
  }, [searchQuery, markdown, scrollToMatch]);

  const renderHighlights = () => {
    const ranges = [];
    if (previewHighlight) {
      ranges.push({ start: previewHighlight.start, end: previewHighlight.end, preview: true });
    }
    if (searchOpen && searchQuery.trim()) {
      const queryLen = searchQuery.length;
      matches.forEach((matchIndex, i) => {
        const end = matchIndex + queryLen;
        const overlaps =
          previewHighlight && matchIndex < previewHighlight.end && end > previewHighlight.start;
        if (overlaps) {
          return;
        }
        ranges.push({
          start: matchIndex,
          end,
          current: i === currentMatchIndex,
        });
      });
    }
    if (ranges.length === 0) {
      return null;
    }
    ranges.sort((a, b) => {
      if (a.preview !== b.preview) {
        return a.preview ? -1 : 1;
      }
      return a.start - b.start;
    });

    const nodes = [];
    let lastIndex = 0;

    ranges.forEach((range, i) => {
      if (range.start < lastIndex) {
        return;
      }
      if (range.start > lastIndex) {
        nodes.push(markdown.slice(lastIndex, range.start));
      }
      const rangeText = markdown.slice(range.start, range.end);
      if (range.preview) {
        const focusAt = Math.min(Math.max(previewHighlight.focus, range.start), range.end);
        nodes.push(
          <mark
            key={`preview-${range.start}`}
            data-preview-mark="true"
            className="rounded-xs bg-sky-400/60 dark:bg-sky-400/35 text-transparent ring-1 ring-sky-500/60"
          >
            {markdown.slice(range.start, focusAt)}
            <span data-preview-focus="true">{markdown.slice(focusAt, range.end)}</span>
          </mark>,
        );
      } else {
        nodes.push(
          <mark
            key={`match-${range.start}-${i}`}
            data-match-current={range.current ? 'true' : undefined}
            className={
              range.current
                ? 'rounded-xs bg-amber-400 text-transparent dark:bg-amber-400/90 ring-2 ring-amber-500 dark:ring-amber-400 font-semibold'
                : 'rounded-xs bg-amber-300/70 text-transparent dark:bg-amber-400/35'
            }
          >
            {rangeText}
          </mark>,
        );
      }
      lastIndex = range.end;
    });

    if (lastIndex < markdown.length) {
      nodes.push(markdown.slice(lastIndex));
    }
    if (markdown.endsWith('\n')) {
      nodes.push('\n ');
    }

    return nodes;
  };

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
    if (!currentDraftId) {
      setDraftNameInput(currentDraftName || 'My ATS CV');
      setSaveAsNew(false);
      setNameError('');
      setShowSaveModal(true);
      return;
    }
    onSaveDraft(currentDraftName);
  };
  const openSaveAsModal = () => {
    setDraftNameInput(currentDraftName || 'My ATS CV');
    setSaveAsNew(true);
    setNameError('');
    setShowSaveModal(true);
  };
  const handleConfirmSave = (e) => {
    e.preventDefault();
    const name = draftNameInput.trim();
    if (!name) {
      setNameError(t.saveNameRequired);
      return;
    }
    if (isNameTaken(name)) {
      setNameError(t.saveNameTaken);
      return;
    }
    setNameError('');
    onSaveDraft(name, saveAsNew);
    setShowSaveModal(false);
  };
  const rememberCaret = useCallback((event) => {
    const position = event?.target?.selectionStart;
    if (typeof position === 'number') {
      caretRef.current = position;
    }
  }, []);

  const keepScroll = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      pendingScroll.current = { top: textarea.scrollTop, left: textarea.scrollLeft };
    }
  }, []);

  const insertSnippet = (id) => {
    const block = snippet(id, lang);
    if (!block) {
      return;
    }
    const textarea = textareaRef.current;

    const caret =
      document.activeElement === textarea
        ? textarea.selectionStart
        : Number.isFinite(caretRef.current)
          ? caretRef.current
          : markdown.length;
    const result = insertSection(markdown, block, caret);
    if (!result || result.markdown === markdown) {
      return;
    }
    keepScroll();
    pendingSelection.current = { start: result.caret, end: result.caret };
    setSuggestions([]);
    setMarkdown(result.markdown);
    setSnippetNotice({
      title: result.title || block.heading,
      kind: block.verbatim ? 'profile' : result.merged ? 'merged' : 'added',
      merged: Boolean(result.merged),
      offset: result.insertedAt,
    });
  };

  const scrollToOffset = useCallback(
    (offset) => {
      const textarea = textareaRef.current;
      if (!textarea || !Number.isFinite(offset)) {
        return;
      }
      const ratio = ratioAtOffset(markdown, offset);
      const scrollable = textarea.scrollHeight - textarea.clientHeight;
      if (scrollable > 0) {
        textarea.scrollTop = Math.max(0, Math.round(ratio * scrollable));
        if (backdropRef.current) {
          backdropRef.current.scrollTop = textarea.scrollTop;
        }
      }
    },
    [markdown],
  );

  useEffect(() => {
    if (!previewHighlight) {
      return undefined;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      return undefined;
    }
    syncPausedUntil.current = Date.now() + 400;
    const frame = requestAnimationFrame(() => {
      const backdrop = backdropRef.current;
      const focus = backdrop?.querySelector('[data-preview-focus]');
      const mark = backdrop?.querySelector('[data-preview-mark]');
      const anchor = (focus && focus.textContent ? focus : mark) || null;
      if (anchor && backdrop) {
        const target = Math.max(0, anchor.offsetTop - Math.round(textarea.clientHeight / 3));
        textarea.scrollTop = target;
        backdrop.scrollTop = textarea.scrollTop;
        backdrop.scrollLeft = textarea.scrollLeft;
        return;
      }
      scrollToOffset(previewHighlight.focus);
      syncBackdrop();
    });
    return () => cancelAnimationFrame(frame);
  }, [previewHighlight, scrollToOffset, syncBackdrop]);

  const snippets = [
    { id: 'profile', label: t.profileSnippetLabel, hint: t.profileSnippetHint, icon: Contact },
    { id: 'summary', label: t.summarySnippetLabel, hint: t.summarySnippetHint, icon: AlignLeft },
    { id: 'experience', label: t.expSnippetLabel, hint: t.expSnippetHint, icon: FileText },
    { id: 'education', label: t.eduSnippetLabel, hint: t.eduSnippetHint, icon: BookOpen },
    { id: 'skills', label: t.skillsSnippetLabel, hint: t.skillsSnippetHint, icon: Code },
    { id: 'certification', label: t.certSnippetLabel, hint: t.certSnippetHint, icon: Award },
  ];

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryMenuStyle, setLibraryMenuStyle] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const libraryRef = useRef(null);
  const libraryButtonRef = useRef(null);

  const placeLibraryMenu = useCallback(() => {
    const button = libraryButtonRef.current;
    if (!button) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const gutter = 12;
    const width = Math.min(288, Math.max(180, window.innerWidth - gutter * 2));
    const left = Math.min(Math.max(gutter, rect.right - width), window.innerWidth - width - gutter);
    const top = Math.min(rect.bottom + 4, Math.max(gutter, window.innerHeight - 120));
    setLibraryMenuStyle({ left, top, width });
  }, []);

  useLayoutEffect(() => {
    if (!libraryOpen) {
      setLibraryMenuStyle(null);
      return undefined;
    }
    placeLibraryMenu();
    window.addEventListener('resize', placeLibraryMenu);
    window.addEventListener('scroll', placeLibraryMenu, true);
    return () => {
      window.removeEventListener('resize', placeLibraryMenu);
      window.removeEventListener('scroll', placeLibraryMenu, true);
    };
  }, [libraryOpen, placeLibraryMenu]);

  const libraryItems = [
    ...savedDrafts.map((draft) => ({
      key: `draft:${draft.id}`,
      label: draft.name,
      hint: t.saved,
      icon: FileText,
      group: t.savedDraftsGroup,
      draftId: draft.id,
      isCurrent: draft.id === currentDraftId,
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
      setConfirmDeleteId(null);
    }
  }, [libraryOpen]);

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
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
          return;
        }
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
  }, [libraryOpen, confirmDeleteId]);

  const pickFromLibrary = (key) => {
    setLibraryOpen(false);
    libraryButtonRef.current?.focus();
    onSelectSample(key);
  };

  const requestDeleteDraft = (draftId) => {
    setConfirmDeleteId(draftId);
  };
  const cancelDeleteDraft = () => {
    setConfirmDeleteId(null);
  };
  const confirmDeleteDraft = (draftId) => {
    setConfirmDeleteId(null);
    libraryButtonRef.current?.focus();
    onDeleteDraft(draftId);
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
    keepScroll();
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
      if (backdropRef.current) {
        backdropRef.current.scrollTop = textarea.scrollTop;
      }
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
      keepScroll();
      pendingSelection.current = { start: caretAfter, end: caretAfter };
      setMarkdown(markdown.slice(0, start) + inserted + markdown.slice(caret));
      setSuggestions([]);
    },
    [markdown, setMarkdown, keepScroll],
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.saveModalTitle}
          className="fixed inset-0 z-50 bg-[var(--ui-bg-overlay)] backdrop-blur-sm flex items-center justify-center p-4"
        >
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
                  onChange={(e) => {
                    setDraftNameInput(e.target.value);
                    if (nameError) {
                      setNameError('');
                    }
                  }}
                  aria-invalid={nameError ? 'true' : undefined}
                  aria-describedby={nameError ? 'draft-name-error' : undefined}
                  placeholder="e.g. Senior Software Engineer CV"
                  className={`app-input w-full text-xs p-2.5 rounded ${
                    nameError ? 'border-amber-500' : ''
                  }`}
                  autoFocus
                />
                {nameError && (
                  <p
                    id="draft-name-error"
                    role="alert"
                    className="mt-1.5 text-xs text-amber-500 flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {nameError}
                  </p>
                )}
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
                style={libraryMenuStyle ?? undefined}
                className="fixed z-50 rounded-xl border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-xl overflow-hidden max-h-[min(60vh,26rem)] overflow-y-auto"
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
                          const isConfirming = confirmDeleteId === item.draftId;
                          return (
                            <div key={item.key}>
                              {isConfirming ? (
                                <div className="rounded-lg bg-amber-500/10 border border-amber-500/40 px-2.5 py-2 space-y-2">
                                  <p className="text-[11px] leading-snug text-[var(--ui-text-primary)] flex items-start gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
                                    <span>{t.confirmDeleteDraft}</span>
                                  </p>
                                  <p className="text-[11px] truncate text-amber-500 font-medium pl-5">
                                    {item.label}
                                  </p>
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={cancelDeleteDraft}
                                      className="px-2 py-1 text-[11px] text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-bg-card)] rounded transition"
                                    >
                                      {t.cancel}
                                    </button>
                                    <button
                                      type="button"
                                      autoFocus
                                      onClick={() => confirmDeleteDraft(item.draftId)}
                                      className="px-2 py-1 text-[11px] font-semibold text-white bg-amber-500 hover:bg-amber-400 rounded transition"
                                    >
                                      {t.deleteDraft}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    data-key={item.key}
                                    onKeyDown={onLibraryKeyDown}
                                    onClick={() => pickFromLibrary(item.key)}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 pr-9 text-left transition hover:bg-[var(--ui-accent-muted)] focus:outline-none focus:bg-[var(--ui-accent-muted)]"
                                  >
                                    <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--ui-accent)]" />
                                    <span className="min-w-0">
                                      <span className="block truncate text-xs font-medium text-[var(--ui-text-primary)]">
                                        {item.label}
                                      </span>
                                      <span className="block truncate text-[10px] text-[var(--ui-text-tertiary)]">
                                        {item.isCurrent ? t.openDraft : item.hint}
                                      </span>
                                    </span>
                                  </button>
                                  {item.draftId && (
                                    <button
                                      type="button"
                                      aria-label={`${t.deleteDraft}: ${item.label}`}
                                      title={t.deleteDraft}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        requestDeleteDraft(item.draftId);
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-tertiary)] hover:text-amber-500 transition focus:outline-none"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <button
            onClick={openSaveModal}
            title={isUnsaved ? t.unsavedTooltip : t.save}
            aria-label={isUnsaved ? `${t.save} - ${t.unsavedTooltip}` : t.save}
            className={`relative p-1.5 rounded border transition flex items-center gap-1 text-xs px-2 ${
              isUnsaved
                ? 'text-amber-500 bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-400'
                : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-badge)] hover:bg-[var(--ui-bg-tertiary)] border-[var(--ui-border-primary)]'
            }`}
          >
            <Save
              className={`w-4 h-4 ${isUnsaved ? 'text-amber-500' : 'text-[var(--ui-accent)]'}`}
            />{' '}
            <span className="hidden sm:inline font-medium">{t.save}</span>
            {isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          </button>
          {currentDraftId && (
            <button
              onClick={openSaveAsModal}
              title={t.saveAs}
              aria-label={t.saveAs}
              className="p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-tertiary)] rounded border border-[var(--ui-border-primary)] transition"
            >
              <FilePlus2 className="w-4 h-4" />
            </button>
          )}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    goToPrevMatch();
                  } else {
                    goToNextMatch();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearchOpen(false);
                  setSearchQuery('');
                  textareaRef.current?.focus();
                }
              }}
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
              type="button"
              onClick={goToPrevMatch}
              disabled={matches.length === 0}
              aria-label="Previous match"
              title="Previous match (Shift+Enter)"
              className="p-1 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] disabled:opacity-30 bg-[var(--ui-bg-card)] rounded border border-[var(--ui-border-primary)]"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={goToNextMatch}
              disabled={matches.length === 0}
              aria-label="Next match"
              title="Next match (Enter)"
              className="p-1 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] disabled:opacity-30 bg-[var(--ui-bg-card)] rounded border border-[var(--ui-border-primary)]"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
                textareaRef.current?.focus();
              }}
              aria-label="Close search"
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
              type="button"
              onMouseDown={(event) => event.preventDefault()}
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

      <div className="flex-1 relative overflow-hidden bg-[var(--ui-bg-primary)]">
        {snippetNotice && (
          <div
            role="status"
            data-testid="snippet-notice"
            className="absolute top-2 right-2 z-30 flex items-center gap-2 max-w-[90%] rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] shadow-lg px-2.5 py-1.5 text-xs text-[var(--ui-text-secondary)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--ui-accent)]" />
            <span className="truncate">
              {snippetNotice.kind === 'profile'
                ? snippetNotice.merged
                  ? t.snippetProfileKept
                  : t.snippetProfileAdded
                : snippetNotice.merged
                  ? t.snippetMerged
                  : t.snippetAdded}{' '}
              <span className="font-semibold text-[var(--ui-text-primary)]">
                {snippetNotice.title}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                scrollToOffset(snippetNotice.offset);
                setSnippetNotice(null);
              }}
              className="shrink-0 px-1.5 py-0.5 rounded border border-[var(--ui-border-primary)] text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card-hover)] transition"
            >
              {t.snippetGoTo}
            </button>
            <button
              type="button"
              onClick={() => setSnippetNotice(null)}
              aria-label={t.snippetClose}
              className="shrink-0 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {((searchOpen && searchQuery.trim() && matches.length > 0) || previewHighlight) && (
          <div
            ref={backdropRef}
            aria-hidden="true"
            data-testid="editor-search-backdrop"
            className="editor-backdrop pointer-events-none absolute inset-0 overflow-hidden p-4 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words select-none text-transparent z-0"
            style={{
              paddingRight: `${16 + scrollbarWidth}px`,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {renderHighlights()}
          </div>
        )}
        <textarea
          ref={textareaRef}
          aria-label={t.markdownEditor}
          value={markdown}
          onChange={(e) => {
            rememberCaret(e);
            setMarkdown(e.target.value, true);
            refreshSuggestions(e.target.value, e.target.selectionStart);
            reportCursor(e.target.selectionStart);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => {
            rememberCaret(e);
            reportCursor(e.target.selectionStart);
          }}
          onSelect={rememberCaret}
          onScroll={(e) => {
            reportScroll();
            if (backdropRef.current) {
              backdropRef.current.scrollTop = e.target.scrollTop;
              backdropRef.current.scrollLeft = e.target.scrollLeft;
            }
          }}
          onBlur={(e) => {
            rememberCaret(e);
            cancelAnimationFrame(cursorFrame.current);
            if (onCursorOffset) {
              onCursorOffset(null);
            }
          }}
          onClick={(e) => {
            rememberCaret(e);
            setSuggestions([]);
            reportCursor(e.target.selectionStart);
          }}
          placeholder="# Name\n**Professional Title**\n\nemail@example.com | +1 555 000 000 | City, Country..."
          className="editor-textarea relative z-10 w-full h-full p-4 bg-transparent text-[var(--ui-text-primary)] font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none selection:bg-[var(--ui-selection-bg)] selection:text-[var(--ui-selection-text)]"
          spellCheck="false"
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
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
