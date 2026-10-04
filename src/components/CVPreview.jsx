import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseMarkdownToATS } from '../utils/markdownParser';
import { createRangeForSourceRange, resolveSelection } from '../utils/markdownSelection';
import {
  applyAlign,
  applyHeading,
  applyInlineFormat,
  applyLink,
  applyList,
  clearFormatting,
  getBlockState,
  isInlineActive,
  replaceRange,
} from '../utils/markdownFormat';
import { callAIEndpoint, enhanceBulletPoint } from '../utils/aiEnhancer';
import { placePopover } from '../utils/popoverPlacement';
import AiRewritePopover from './AiRewritePopover';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  FileCheck,
  Github,
  Gitlab,
  Globe,
  GripVertical,
  Hand,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  Linkedin,
  List,
  ListOrdered,
  Maximize,
  Redo2,
  Sparkles,
  Strikethrough,
  Type,
  Underline,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import useContactVerification from '../hooks/useContactVerification';
import { hostOf } from '../utils/contactScan';
import { listSections, moveSection, sectionIndexAt } from '../utils/markdownSections';
import { contentHeightFor, keepsWithNext, planPages, splitTopLevelHtml } from '../utils/paginate';
import { blockAtOffset, scrollRatio } from '../utils/scrollSync';
import PageThumbnails from './PageThumbnails';

const INLINE_TYPES = ['bold', 'italic', 'underline', 'strikethrough', 'code'];
const SHORTCUT_TYPES = { b: 'bold', i: 'italic', u: 'underline' };

const MARKER_SIZE = 18;

const PX_PER_MM = 96 / 25.4;
const PAPER_WIDTH_PX = 210 * PX_PER_MM;

const MIN_PREVIEW_SCALE = 0.35;

const ZOOM_STEP = 1.2;
const MIN_USER_ZOOM = 0.5;
const MAX_USER_ZOOM = 2.5;

const PAPER_CONTROLS = 'button, a, [role="button"], input, textarea, select';

const SITE_ICONS = { 'linkedin.com': Linkedin, 'github.com': Github, 'gitlab.com': Gitlab };
const siteIcon = (host) => SITE_ICONS[host] || Globe;

const FLASH_MS = 1400;

const SHEET_GAP = 8;

const normalizeTarget = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[.,;:]+$/, '')
    .replace(/\/+$/, '');

const anchorMatchesItem = (anchor, item) => {
  const targets = new Set([item.value, item.href].filter(Boolean).map(normalizeTarget));
  return [anchor.getAttribute('href'), anchor.textContent]
    .filter(Boolean)
    .some((value) => targets.has(normalizeTarget(value)));
};

const sameMarkerList = (previous, next) =>
  previous.length === next.length &&
  previous.every(
    (marker, index) =>
      marker.id === next[index].id &&
      marker.top === next[index].top &&
      marker.left === next[index].left,
  );

const samePagePlan = (previous, next) =>
  previous.length === next.length &&
  previous.every((page, i) => page.join(',') === next[i].join(','));

function toPlainText(markdown, range) {
  return markdown
    .slice(range.start, range.end)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|\*|_|`)/g, '')
    .replace(/^[ \t]*(#{1,6}|>|[-*+]|\d+[.)])[ \t]+/gm, '')
    .trim();
}

export default function CVPreview({
  markdown,
  setMarkdown,
  styles,
  t,
  undo,
  redo,
  canUndo,
  canRedo,
  syncRequest = null,
  onScrollRatio = null,
  cursorRequest = null,
  lang = 'en',
  aiEnabled = false,
  aiSettings = {},
  onPageCount = null,
}) {
  const pagesRef = useRef(null);
  const pageRefs = useRef([]);
  const measureRef = useRef(null);
  const containerRef = useRef(null);
  const panRef = useRef(null);
  const toolbarRef = useRef(null);
  const restoreRef = useRef(null);
  const markdownRef = useRef(markdown);
  const [selection, setSelection] = useState(null);
  const [linkDraft, setLinkDraft] = useState(null);
  const [linkMarkers, setLinkMarkers] = useState([]);
  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [canPan, setCanPan] = useState(false);
  const [panning, setPanning] = useState(false);

  const [handMode, setHandMode] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedSection, setDraggedSection] = useState(null);
  const [hoverSection, setHoverSection] = useState(null);
  const [pagePlan, setPagePlan] = useState([[]]);
  const [activePage, setActivePage] = useState(0);
  const { items: contactItems, verified } = useContactVerification(markdown);

  markdownRef.current = markdown;

  const formattedHtml = useMemo(() => parseMarkdownToATS(markdown), [markdown]);

  const chunks = useMemo(() => splitTopLevelHtml(formattedHtml), [formattedHtml]);

  const layoutKey = [
    styles.fontSize,
    styles.lineHeight,
    styles.marginX,
    styles.marginY,
    styles.fontFamily,
    styles.itemGap,
    styles.sectionGap,
    styles.bulletStyle,
    styles.borderStyle,
  ].join('|');
  const sections = useMemo(() => listSections(markdown), [markdown]);

  const pages = useMemo(
    () => pagePlan.map((indexes) => indexes.map((index) => chunks[index] ?? '').join('')),
    [pagePlan, chunks],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const fit = () => {
      const style = window.getComputedStyle(container);
      const room =
        container.clientWidth -
        parseFloat(style.paddingLeft || '0') -
        parseFloat(style.paddingRight || '0');

      if (!(room > 0)) {
        return;
      }
      const scale = Math.min(1, Math.max(MIN_PREVIEW_SCALE, room / PAPER_WIDTH_PX));
      setFitScale((previous) => (Math.abs(previous - scale) > 0.005 ? scale : previous));
    };
    fit();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const previewScale = Math.min(MAX_USER_ZOOM, Math.max(MIN_PREVIEW_SCALE, fitScale * userZoom));
  const zoomBy = (factor) =>
    setUserZoom((value) =>
      Math.min(MAX_USER_ZOOM, Math.max(MIN_USER_ZOOM, Number((value * factor).toFixed(4)))),
    );

  const measurePagination = useCallback(() => {
    const node = measureRef.current;
    const children = node ? Array.from(node.children) : [];
    // A lone <br> spacer reports offsetTop 0, so measuring through it invents pages.
    const blocks = children.filter((child) => child.tagName !== 'BR');
    if (blocks.length === 0) {
      setPagePlan((previous) => (samePagePlan(previous, [[]]) ? previous : [[]]));
      return;
    }

    const last = blocks[blocks.length - 1];
    const trailingBreaks = children.length - 1 - children.indexOf(last);
    const trailingHeight =
      trailingBreaks * (parseFloat(window.getComputedStyle(node).lineHeight) || 0);
    const advances = blocks.map((block, index) => {
      const next = blocks[index + 1];
      if (next) {
        return Math.max(0, next.offsetTop - block.offsetTop);
      }
      const style = window.getComputedStyle(block);
      return block.offsetHeight + (parseFloat(style.marginBottom) || 0) + trailingHeight;
    });

    const positions = blocks.map((block) => children.indexOf(block));
    const plan = planPages(advances, {
      contentHeight: contentHeightFor(styles.marginY),
      keepWithNext: blocks.map((block) => keepsWithNext(block.innerHTML)),
    }).map((page) => page.map((position) => positions[position]));
    setPagePlan((previous) => (samePagePlan(previous, plan) ? previous : plan));
  }, [styles.marginY]);

  useLayoutEffect(() => {
    let pending = 0;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) {
        return;
      }
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        if (!cancelled) {
          measurePagination();
        }
      });
    };

    measurePagination();
    schedule();
    const node = measureRef.current;
    if (node && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(schedule);
      observer.observe(node);
      return () => {
        cancelled = true;
        cancelAnimationFrame(pending);
        observer.disconnect();
      };
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(pending);
    };
  }, [formattedHtml, layoutKey, measurePagination]);

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(
      () => {
        if (!cancelled) {
          measurePagination();
        }
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [measurePagination]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const measure = () => {
      const bigger =
        container.scrollWidth > container.clientWidth + 1 ||
        container.scrollHeight > container.clientHeight + 1;
      setCanPan(bigger);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [previewScale, pages.length]);

  const zoomedIn = userZoom > 1;

  useEffect(() => {
    setHandMode(zoomedIn);
  }, [zoomedIn]);

  const startPan = (event) => {
    if (
      !canPan ||
      !handMode ||
      panning ||
      reorderMode ||
      event.button !== 0 ||
      event.pointerType === 'touch'
    ) {
      return;
    }
    if (event.target.closest?.(PAPER_CONTROLS)) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: container.scrollLeft,
      top: container.scrollTop,
    };
    container.setPointerCapture?.(event.pointerId);
    setPanning(true);
    event.preventDefault();
  };

  const movePan = (event) => {
    const pan = panRef.current;
    const container = containerRef.current;
    if (!pan || !container || pan.pointerId !== event.pointerId) {
      return;
    }
    container.scrollLeft = pan.left - (event.clientX - pan.x);
    container.scrollTop = pan.top - (event.clientY - pan.y);
  };

  const endPan = (event) => {
    if (panRef.current?.pointerId !== event.pointerId) {
      return;
    }
    containerRef.current?.releasePointerCapture?.(event.pointerId);
    panRef.current = null;
    setPanning(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const onWheel = (event) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const scrollTopForSheet = useCallback((sheet, container) => {
    const onScreen = sheet.getBoundingClientRect().top - container.getBoundingClientRect().top;
    return Math.max(0, Math.round(container.scrollTop + onScreen - SHEET_GAP));
  }, []);

  const goToPage = useCallback(
    (index) => {
      const sheet = pageRefs.current[index];
      const container = containerRef.current;
      if (!sheet || !container) {
        return;
      }
      setActivePage(index);
      container.scrollTop = scrollTopForSheet(sheet, container);
    },
    [scrollTopForSheet],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let index = 0;
        pageRefs.current.forEach((sheet, position) => {
          if (sheet && scrollTopForSheet(sheet, container) <= container.scrollTop + 1) {
            index = position;
          }
        });
        setActivePage((current) => (current === index ? current : index));
        if (onScrollRatio) {
          onScrollRatio(
            scrollRatio(container.scrollTop, container.scrollHeight, container.clientHeight),
          );
        }
      });
    };
    container.addEventListener('scroll', report, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('scroll', report);
    };
  }, [onScrollRatio, pages.length, scrollTopForSheet]);

  const cursorRef = useRef(null);
  useEffect(() => {
    const previous = cursorRef.current;
    cursorRef.current = null;
    if (previous?.isConnected) {
      previous.classList.remove('cv-cursor-line');
    }
    if (!cursorRequest) {
      return undefined;
    }
    const block = blockAtOffset(pagesRef.current, cursorRequest.offset);
    const element = block?.element;
    if (!element) {
      return undefined;
    }
    element.classList.add('cv-cursor-line');
    cursorRef.current = element;
    return () => {
      element.classList.remove('cv-cursor-line');
    };
  }, [cursorRequest, pages]);

  useEffect(() => {
    if (!syncRequest) {
      return;
    }
    const block = blockAtOffset(pagesRef.current, syncRequest.offset);
    const element = block?.element;
    if (!element) {
      return;
    }
    const sheet = pageRefs.current.find((page) => page?.contains(element));
    if (sheet) {
      goToPage(pageRefs.current.indexOf(sheet));
    }
    element.classList.add('cv-sync-flash');
    const timer = setTimeout(() => element.classList.remove('cv-sync-flash'), FLASH_MS);
    return () => {
      clearTimeout(timer);
      element.classList.remove('cv-sync-flash');
    };
  }, [syncRequest, goToPage]);

  const reorderTo = useCallback(
    (fromIndex, toIndex) => {
      const moved = moveSection(markdownRef.current, fromIndex, toIndex);
      if (moved) {
        setMarkdown(moved);
      }
    },
    [setMarkdown],
  );

  const sectionIndexOf = useCallback(
    (node) => {
      const title = node?.closest?.('h3[data-cv-start]');
      if (!title) {
        return -1;
      }
      return sectionIndexAt(sections, Number(title.getAttribute('data-cv-start')));
    },
    [sections],
  );

  useEffect(() => {
    const root = pagesRef.current;
    if (!root) {
      return;
    }
    for (const title of root.querySelectorAll('h3[data-cv-start]')) {
      title.draggable = reorderMode;
      title.classList.toggle('cv-section-handle', reorderMode);
      const index = sectionIndexAt(sections, Number(title.getAttribute('data-cv-start')));
      title.classList.toggle('cv-dragging', reorderMode && index === draggedSection);
      title.classList.toggle(
        'cv-drag-over',
        reorderMode && index === hoverSection && index !== draggedSection,
      );
      if (reorderMode) {
        title.setAttribute('tabindex', '0');
        title.setAttribute('role', 'button');
        title.setAttribute('title', t.reorderHint);
      } else {
        title.removeAttribute('tabindex');
        title.removeAttribute('role');
        title.removeAttribute('title');
        title.classList.remove('cv-drag-over');
        title.classList.remove('cv-dragging');
      }
    }
  }, [reorderMode, formattedHtml, sections, hoverSection, draggedSection, t.reorderHint]);

  const handleDragStart = (event) => {
    if (!reorderMode) {
      return;
    }
    const index = sectionIndexOf(event.target);
    if (index < 0) {
      return;
    }
    setDraggedSection(index);
    event.dataTransfer.effectAllowed = 'move';

    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event) => {
    if (!reorderMode || draggedSection === null) {
      return;
    }
    const index = sectionIndexOf(event.target);
    if (index < 0 || index === draggedSection) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setHoverSection(index);
  };

  const handleDrop = (event) => {
    if (!reorderMode || draggedSection === null) {
      return;
    }
    event.preventDefault();
    const index = sectionIndexOf(event.target);
    if (index >= 0 && index !== draggedSection) {
      reorderTo(draggedSection, index);
    }
    setDraggedSection(null);
    setHoverSection(null);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setHoverSection(null);
  };

  const handleSectionKeyDown = (event) => {
    if (!reorderMode) {
      return;
    }
    const index = sectionIndexOf(event.target);
    if (index < 0) {
      return;
    }
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!step) {
      return;
    }
    event.preventDefault();
    const target = index + step;
    if (target < 0 || target >= sections.length) {
      return;
    }
    reorderTo(index, target);

    requestAnimationFrame(() => {
      const titles = pagesRef.current?.querySelectorAll('h3[data-cv-start]') || [];
      const moved = titles[Math.max(0, Math.min(target, titles.length - 1))];
      moved?.focus?.();
    });
  };

  const active = useMemo(() => {
    if (!selection) {
      return {};
    }
    const inline = {};
    for (const type of INLINE_TYPES) {
      inline[type] = isInlineActive(markdown, selection, type);
    }
    return { ...inline, ...getBlockState(markdown, selection) };
  }, [markdown, selection]);

  useEffect(() => {
    let frame = 0;
    const handleSelectionChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0) {
          return;
        }
        const range = domSelection.getRangeAt(0);
        const insidePaper = pagesRef.current?.contains(range.commonAncestorContainer);
        if (range.collapsed) {
          const insideToolbar = toolbarRef.current?.contains(range.commonAncestorContainer);
          if (!insidePaper && !insideToolbar) {
            setSelection(null);
          }
          return;
        }
        if (insidePaper) {
          setSelection(resolveSelection(pagesRef.current, range, markdownRef.current));
        }
      });
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const pending = restoreRef.current;
    if (!pending) {
      return;
    }
    restoreRef.current = null;
    const domRange = createRangeForSourceRange(pagesRef.current, pending.range, pending.text);
    if (!domRange) {
      return;
    }
    const domSelection = window.getSelection();
    domSelection.removeAllRanges();
    domSelection.addRange(domRange);
    setSelection(resolveSelection(pagesRef.current, domRange, markdown));
  }, [markdown]);

  const runFormat = (result) => {
    if (!result) {
      return;
    }
    setMarkdown(result.markdown);
    restoreRef.current = { range: result.range, text: toPlainText(result.markdown, result.range) };
  };

  const [aiPopover, setAiPopover] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const closeAiRewrite = useCallback(() => {
    setAiPopover(null);
    setAiLoading(false);
    setAiError(null);
  }, []);

  const openAiRewrite = useCallback(() => {
    const current = selection;
    if (!current?.text?.trim()) {
      return;
    }
    const root = pagesRef.current;
    const domSelection = window.getSelection();
    const range = domSelection?.rangeCount ? domSelection.getRangeAt(0) : null;
    const live = range && root?.contains(range.commonAncestorContainer) ? range : null;
    let rect = live?.getBoundingClientRect?.() || null;
    if (!rect || rect.width + rect.height <= 0) {
      rect = blockAtOffset(root, current.start)?.element?.getBoundingClientRect?.() || null;
    }
    const { top, left } = placePopover({
      rect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    const { suggestions } = enhanceBulletPoint(current.text, lang);
    setAiError(null);
    setAiLoading(false);
    setAiPopover({
      top,
      left,
      original: current.text.trim(),
      options: suggestions,
    });
  }, [lang, selection]);

  const pickAiOption = useCallback(
    (text) => {
      if (!selection) {
        closeAiRewrite();
        return;
      }
      runFormatRef.current(replaceRange(markdownRef.current, selection, text));
      closeAiRewrite();
    },
    [closeAiRewrite, selection],
  );

  const generateAiOption = useCallback(async () => {
    const current = selection;
    if (!current?.text?.trim()) {
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const output = await callAIEndpoint({
        prompt: `Rewrite the following resume fragment keeping the exact same meaning, with stronger action verbs and quantified impact. Return ONLY the rewritten fragment, no quotes, no explanation:\n\n"${current.text}"`,
        endpoint: aiSettings.endpoint,
        apiKey: aiSettings.apiKey,
        model: aiSettings.model,
      });
      const text = String(output || '')
        .trim()
        .replace(/^["“”']+|["“”']+$/g, '');
      if (!text) {
        throw new Error('empty answer');
      }
      setAiPopover((previous) =>
        previous ? { ...previous, options: [...previous.options, text] } : previous,
      );
    } catch (err) {
      setAiError(`${t.aiRewriteError} (${err.message})`);
    } finally {
      setAiLoading(false);
    }
  }, [aiSettings.endpoint, aiSettings.apiKey, aiSettings.model, selection, t.aiRewriteError]);

  const runFormatRef = useRef(runFormat);
  runFormatRef.current = runFormat;

  const measureMarkers = useCallback(() => {
    const markers = [];
    pageRefs.current.forEach((paper, pageIndex) => {
      if (!paper) {
        return;
      }
      const anchors = Array.from(paper.querySelectorAll('a[href]'));

      const width = paper.offsetWidth;
      const maxTop = paper.offsetHeight > MARKER_SIZE ? paper.offsetHeight - MARKER_SIZE : Infinity;
      const maxLeft = width > MARKER_SIZE ? width - MARKER_SIZE : Infinity;
      const inside = (value, max) => Math.min(Math.max(value, 0), max);

      contactItems
        .filter((item) => item.kind === 'link' && verified[item.id])
        .forEach((item) => {
          const anchor = anchors.find((node) => anchorMatchesItem(node, item));
          if (!anchor) {
            return;
          }
          const right = anchor.offsetLeft + anchor.offsetWidth;
          const fitsRight = right + 4 + MARKER_SIZE <= width - 4;
          markers.push({
            id: `${pageIndex}:${item.id}`,
            href:
              item.href || (/^https?:/i.test(item.value) ? item.value : `https://${item.value}`),
            host: hostOf(item),
            page: pageIndex,
            top: inside(anchor.offsetTop - 2, maxTop),

            left: fitsRight
              ? Math.min(right + 4, maxLeft)
              : Math.max(anchor.offsetLeft - MARKER_SIZE - 4, 4),
          });
        });
    });

    setLinkMarkers((previous) => (sameMarkerList(previous, markers) ? previous : markers));
  }, [contactItems, verified]);

  useEffect(() => {
    let pending = 0;
    let cancelled = false;
    const observers = [];
    const schedule = () => {
      if (cancelled) {
        return;
      }
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        if (!cancelled) {
          measureMarkers();
        }
      });
    };
    const root = pagesRef.current;

    measureMarkers();
    schedule();
    if (root) {
      if (typeof ResizeObserver !== 'undefined') {
        const resize = new ResizeObserver(schedule);
        pageRefs.current.forEach((page) => page && resize.observe(page));
        observers.push(resize);
      }

      if (typeof MutationObserver !== 'undefined') {
        const mutation = new MutationObserver(schedule);
        mutation.observe(root, { childList: true, subtree: true, characterData: true });
        observers.push(mutation);
      }
    }
    window.addEventListener('resize', schedule);

    document.fonts?.ready.then(
      () => {
        schedule();
      },
      () => {},
    );
    document.fonts?.addEventListener?.('loadingdone', schedule);

    return () => {
      cancelled = true;
      cancelAnimationFrame(pending);
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [pages, layoutKey, measureMarkers]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey || !(event.ctrlKey || event.metaKey)) {
        return;
      }
      const type = SHORTCUT_TYPES[event.key.toLowerCase()];
      const domSelection = window.getSelection();
      if (!type || !domSelection?.rangeCount) {
        return;
      }
      const range = domSelection.getRangeAt(0);
      if (!pagesRef.current?.contains(range.commonAncestorContainer)) {
        return;
      }
      const current = resolveSelection(pagesRef.current, range, markdownRef.current);
      if (!current) {
        return;
      }
      event.preventDefault();
      runFormatRef.current(applyInlineFormat(markdownRef.current, current, type));
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const applyFormat = (type) => {
    if (!selection) {
      return;
    }
    if (type === 'link') {
      if (linkDraft === null) {
        setLinkDraft('');
        return;
      }
      runFormat(applyLink(markdown, selection, linkDraft));
      setLinkDraft(null);
      return;
    }
    if (type === 'clear') {
      runFormat(clearFormatting(markdown, selection));
      return;
    }
    if (type.startsWith('h')) {
      runFormat(applyHeading(markdown, selection, Number(type.slice(1))));
      return;
    }
    if (type === 'bullet' || type === 'ordered') {
      runFormat(applyList(markdown, selection, type));
      return;
    }
    if (type.startsWith('align-')) {
      runFormat(applyAlign(markdown, selection, type.replace('align-', '')));
      return;
    }
    runFormat(applyInlineFormat(markdown, selection, type));
  };

  const paperStyle = {
    '--cv-font-family': styles.fontFamily,
    '--cv-font-size': `${styles.fontSize}px`,
    '--cv-line-height': styles.lineHeight,
    '--cv-margin-y': `${styles.marginY}px`,
    '--cv-margin-x': `${styles.marginX}px`,
    '--cv-section-gap': `${styles.sectionGap}px`,
    '--cv-item-gap': `${styles.itemGap}px`,
    // The sheet reads these names, so the style panel colours have to use them too.
    '--cv-paper-primary': styles.primaryColor,
    '--cv-paper-text': styles.textColor,
    '--cv-paper-subtext': styles.subtextColor,
    '--cv-paper-border': `color-mix(in srgb, ${styles.primaryColor} 32%, #ffffff)`,
    '--cv-paper-bullet': styles.textColor,
    '--cv-bullet-style': `'${styles.bulletStyle} '`,
  };

  const groups = [
    [
      { type: 'bold', icon: Bold, label: t.fmtBold },
      { type: 'italic', icon: Italic, label: t.fmtItalic },
      { type: 'underline', icon: Underline, label: t.fmtUnderline },
      { type: 'strikethrough', icon: Strikethrough, label: t.fmtStrike },
      { type: 'code', icon: Code, label: t.fmtCode },
    ],
    [
      { type: 'h1', icon: Heading1, label: t.fmtH1 },
      { type: 'h2', icon: Heading2, label: t.fmtH2 },
      { type: 'h3', icon: Heading3, label: t.fmtH3 },
      { type: 'bullet', icon: List, label: t.fmtBullet },
      { type: 'ordered', icon: ListOrdered, label: t.fmtOrdered },
    ],
    [
      { type: 'align-left', icon: AlignLeft, label: t.fmtAlignLeft },
      { type: 'align-center', icon: AlignCenter, label: t.fmtAlignCenter },
      { type: 'align-right', icon: AlignRight, label: t.fmtAlignRight },
    ],
  ];

  useEffect(() => {
    pageRefs.current.length = pages.length;
  }, [pages.length]);

  useEffect(() => {
    onPageCount?.(pages.length);
  }, [pages.length, onPageCount]);

  return (
    <div className="app-preview flex h-full flex-col overflow-hidden bg-[var(--ui-bg-primary)] relative">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ui-border-primary)] bg-[var(--ui-bg-secondary)] p-3 no-print shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCheck className="w-5 h-5 shrink-0 text-[var(--ui-accent)]" />
          <span className="truncate text-sm font-semibold text-[var(--ui-text-secondary)]">
            {t.atsPreviewTitle}
          </span>
          <span className="shrink-0 rounded border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--ui-accent)]">
            {t.vectorPDFBadge}
          </span>
        </div>
        <span className="shrink-0 rounded border border-[var(--ui-border-primary)] bg-[var(--ui-bg-primary)] px-2 py-0.5 font-mono text-[10px] text-[var(--ui-text-tertiary)]">
          {pages.length} {t.atsPdfPages}
        </span>
      </div>

      <div
        ref={toolbarRef}
        onMouseDown={(event) => {
          if (event.target.tagName !== 'INPUT') {
            event.preventDefault();
          }
        }}
        className="flex items-center gap-1 px-2 py-1.5 bg-[var(--ui-bg-secondary)] border-b border-[var(--ui-border-primary)] text-[11px] no-print shrink-0"
      >
        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title={t.undo}
            aria-label={t.undo}
            className="p-1.5 rounded text-[var(--ui-text-tertiary)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent-muted)] transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--ui-text-tertiary)] disabled:hover:bg-transparent"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title={t.redo}
            aria-label={t.redo}
            className="p-1.5 rounded text-[var(--ui-text-tertiary)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent-muted)] transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--ui-text-tertiary)] disabled:hover:bg-transparent"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="w-px h-4 bg-[var(--ui-border-primary)] mx-1 shrink-0" />

        {groups.map((group, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="w-px h-4 bg-[var(--ui-border-primary)] mx-1 shrink-0" />}
            <div className="flex items-center gap-0.5">
              {group.map(({ type, icon: Icon, label }) => {
                const isActive =
                  Boolean(active[type]) ||
                  (type.startsWith('h') && active.heading === Number(type.slice(1)));
                return (
                  <button
                    key={type}
                    onClick={() => applyFormat(type)}
                    disabled={!selection}
                    title={label}
                    aria-label={label}
                    aria-pressed={isActive}
                    className={`p-1.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] ring-1 ring-[var(--ui-accent-border)]'
                        : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent-muted)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}

        <span className="w-px h-4 bg-[var(--ui-border-primary)] mx-1 shrink-0" />

        {linkDraft === null ? (
          <button
            onClick={() => applyFormat('link')}
            disabled={!selection}
            title={t.fmtLink}
            aria-label={t.fmtLink}
            aria-pressed={false}
            className={`p-1.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
              selection
                ? 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent-muted)]'
                : 'text-[var(--ui-text-tertiary)]'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applyFormat('link');
                } else if (event.key === 'Escape') {
                  setLinkDraft(null);
                }
              }}
              placeholder={t.fmtLinkPlaceholder}
              className="app-input w-40 text-[11px] p-1 rounded border border-[var(--ui-border-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ui-accent)]"
              autoFocus
            />
            <button
              onClick={() => applyFormat('link')}
              title={t.fmtLinkApply}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--ui-accent)] text-[var(--ui-text-inverse)] transition"
            >
              {t.save}
            </button>
            <button
              onClick={() => setLinkDraft(null)}
              title={t.cancel}
              className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)] transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <span className="w-px h-4 bg-[var(--ui-border-primary)] mx-1 shrink-0" />

        <button
          onClick={() => applyFormat('clear')}
          disabled={!selection}
          title={t.fmtClear}
          aria-label={t.fmtClear}
          className="p-1.5 rounded text-rose-400 hover:bg-rose-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-2 pl-2 min-w-0">
          {aiEnabled && (
            <button
              onClick={openAiRewrite}
              disabled={!selection}
              title={t.aiRewriteHint}
              aria-label={t.aiRewrite}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border whitespace-nowrap transition disabled:opacity-40 disabled:cursor-not-allowed ${
                selection
                  ? 'border-[var(--ui-accent)]/40 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/10'
                  : 'text-[var(--ui-text-tertiary)] border-[var(--ui-border-primary)]'
              }`}
            >
              <Sparkles className="w-3 h-3" /> {t.aiRewrite}
            </button>
          )}
          <button
            onClick={() => setReorderMode((value) => !value)}
            aria-pressed={reorderMode}
            title={reorderMode ? t.reorderDone : t.reorderStart}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border whitespace-nowrap transition ${
              reorderMode
                ? 'bg-[var(--ui-accent)] text-[var(--ui-text-inverse)] border-[var(--ui-accent)]'
                : 'text-[var(--ui-text-tertiary)] border-[var(--ui-border-primary)] hover:text-[var(--ui-text-primary)]'
            }`}
          >
            <GripVertical className="w-3 h-3" /> {reorderMode ? t.reorderDone : t.reorderStart}
          </button>
          <span className="truncate text-[10px] text-[var(--ui-text-muted)]">
            {selection
              ? `${t.fmtSelected}: ${selection.text.trim().length} ${t.fmtChars}`
              : t.fmtHint}
          </span>
          {selection && (
            <button
              onClick={() => {
                window.getSelection()?.removeAllRanges();
                setSelection(null);
              }}
              title={t.fmtClearSelection}
              aria-label={t.fmtClearSelection}
              className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--ui-text-primary)] transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {reorderMode && (
        <p className="px-4 py-1.5 text-[11px] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] border-b border-[var(--ui-accent-border)] flex items-center gap-1.5">
          <GripVertical className="w-3 h-3 shrink-0" /> {t.reorderHint}
        </p>
      )}

      <div className="app-preview-body flex min-h-0 flex-1">
        <PageThumbnails
          pages={pagePlan}
          activePage={activePage}
          onSelect={goToPage}
          label={t.previewPages}
        />

        <div
          ref={containerRef}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onScroll={() => {
            if (!aiLoading) {
              setAiPopover(null);
              setAiError(null);
            }
          }}
          className={`cv-paper-container cv-page-container flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center${
            panning ? ' select-none cursor-grabbing' : ''
          }`}
        >
          <div ref={pagesRef} className="cv-pages flex flex-col items-center gap-5">
            {pages.map((html, index) => (
              <div
                key={index}
                className="cv-page relative"
                style={{ zoom: previewScale }}
                data-page={index + 1}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onKeyDown={handleSectionKeyDown}
              >
                <div
                  ref={(node) => {
                    pageRefs.current[index] = node;
                  }}
                  style={paperStyle}
                  className={`cv-paper border-style-${styles.borderStyle} text-left rounded-sm select-text ${
                    panning ? 'cursor-grabbing' : canPan && handMode ? 'cursor-grab' : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: html }}
                />

                <span
                  className="no-print cv-page-number pointer-events-none absolute bottom-2 right-3 font-mono text-[10px] text-slate-400"
                  aria-hidden="true"
                >
                  {index + 1} / {pages.length}
                </span>

                {linkMarkers
                  .filter((marker) => marker.page === index)
                  .map((marker) => {
                    const Icon = siteIcon(marker.host);
                    return (
                      <a
                        key={marker.id}
                        href={marker.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={`${marker.host} — ${t.contactOpenExternal}`}
                        style={{
                          top: `${marker.top}px`,
                          left: `${marker.left}px`,
                          width: `${MARKER_SIZE}px`,
                          height: `${MARKER_SIZE}px`,
                        }}
                        className="no-print absolute z-10 flex items-center justify-center rounded-full border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)]/80 text-[var(--ui-text-tertiary)] opacity-60 shadow-sm backdrop-blur-sm transition hover:opacity-100 hover:border-[var(--ui-accent)] hover:bg-[var(--ui-accent)] hover:text-[var(--ui-text-inverse)]"
                      >
                        <Icon className="w-3 h-3" />
                      </a>
                    );
                  })}
              </div>
            ))}
          </div>

          <div
            ref={measureRef}
            aria-hidden="true"
            style={paperStyle}
            className={`cv-paper cv-paper-measure border-style-${styles.borderStyle}`}
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        </div>
      </div>

      {aiPopover && (
        <AiRewritePopover
          anchor={{ top: aiPopover.top, left: aiPopover.left }}
          original={aiPopover.original}
          options={aiPopover.options}
          loading={aiLoading}
          error={aiError}
          t={t}
          onPick={pickAiOption}
          onGenerate={generateAiOption}
          onClose={closeAiRewrite}
        />
      )}

      <div className="no-print absolute bottom-4 right-4 z-30 flex flex-col gap-1 rounded-lg border border-[var(--ui-border-primary)] bg-[var(--ui-bg-card)] p-1 shadow-md">
        {[
          { label: t.previewZoomIn, icon: ZoomIn, action: () => zoomBy(ZOOM_STEP) },
          { label: t.previewZoomOut, icon: ZoomOut, action: () => zoomBy(1 / ZOOM_STEP) },
          { label: t.previewZoomReset, icon: Maximize, action: () => setUserZoom(1) },

          ...(zoomedIn
            ? [
                {
                  label: handMode ? t.previewSelectText : t.previewMovePage,
                  icon: handMode ? Hand : Type,
                  pressed: handMode,
                  action: () => setHandMode((value) => !value),
                },
              ]
            : []),
        ].map(({ label, icon: Icon, action, pressed }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            title={label}
            aria-label={label}
            aria-pressed={pressed}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition ${
              pressed
                ? 'text-[var(--ui-accent)] bg-[var(--ui-accent-muted)]'
                : 'text-[var(--ui-text-tertiary)] hover:text-[var(--ui-accent)] hover:bg-[var(--ui-accent-muted)]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
