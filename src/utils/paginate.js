const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const TAG_RE = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

export function splitTopLevelHtml(html) {
  const source = String(html || '');
  const chunks = [];
  let depth = 0;
  let start = 0;
  let match;

  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(source)) !== null) {
    if (match[0].startsWith('<!--')) {
      continue;
    }
    const tag = match[1].toLowerCase();
    const selfContained = match[0].endsWith('/>') || VOID_TAGS.has(tag);

    if (match[0][1] === '/') {
      depth -= 1;
      if (depth === 0) {
        chunks.push(source.slice(start, TAG_RE.lastIndex));
        start = TAG_RE.lastIndex;
      }
      continue;
    }
    if (depth === 0) {
      start = match.index;
    }
    if (selfContained) {
      if (depth === 0) {
        chunks.push(source.slice(start, TAG_RE.lastIndex));
        start = TAG_RE.lastIndex;
      }
      continue;
    }
    depth += 1;
  }

  if (start < source.length && source.slice(start).trim()) {
    if (chunks.length > 0) {
      chunks[chunks.length - 1] += source.slice(start);
    } else {
      chunks.push(source.slice(start));
    }
  }
  return chunks;
}

export function planPages(advances, { contentHeight, keepWithNext = [] }) {
  const pages = [];
  let current = [];
  let used = 0;

  advances.forEach((advance, index) => {
    const space = Number.isFinite(advance) ? Math.max(0, advance) : 0;
    const overflows = current.length > 0 && used + space > contentHeight;

    if (overflows) {
      const move = [];
      while (current.length > 1 && keepWithNext[current[current.length - 1]]) {
        move.unshift(current.pop());
      }
      pages.push(current);
      current = move;
      used = current.reduce((total, block) => total + Math.max(0, advances[block] || 0), 0);
    }
    current.push(index);
    used += space;
  });

  if (current.length > 0) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [[]];
}

export const PAGE_HEIGHT_PX = 297 * (96 / 25.4);
export const PAGE_WIDTH_PX = 210 * (96 / 25.4);

export function contentHeightFor(marginY) {
  return Math.max(1, PAGE_HEIGHT_PX - 2 * (Number(marginY) || 0));
}

export function keepsWithNext(html) {
  return (
    /^\s*<h[1-6]\b/i.test(String(html || '')) ||
    /^\s*<div\b[^>]*cv-entry-title/i.test(String(html || ''))
  );
}
