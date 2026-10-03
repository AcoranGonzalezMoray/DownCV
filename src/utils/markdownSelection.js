const SYNTAX_CHARS = '*_~`[]()#+-!<>|\\';
const SHOW_TEXT = 4;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildLoosePattern(text) {
  let pattern = '';
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const literal = escapeRegExp(char);
    const allowSyntax = i > 0 ? `(?:[*_~\\[\\]()#+\\-!<>|\\\\]{1,2})?` : '';
    if (/\s/.test(char)) {
      pattern += `${allowSyntax}\\s`;
    } else if (SYNTAX_CHARS.includes(char)) {
      pattern += `${allowSyntax}(?:${literal}|[*_~\\[\\]()#+\\-!<>|\\\\]{1,2})`;
    } else {
      pattern += allowSyntax + literal;
    }
  }
  return new RegExp(pattern);
}

function getBlocks(paperEl) {
  return Array.from(paperEl.querySelectorAll('[data-cv-start]'));
}

function textOffsetWithin(el, node, offset) {
  const length = el.textContent?.length ?? 0;
  if (!node || !el.contains(node)) {
    return 0;
  }

  let total = 0;
  const walker = document.createTreeWalker(el, SHOW_TEXT);
  let current;
  while ((current = walker.nextNode())) {
    if (current === node || node.contains(current)) {
      break;
    }
    total += current.nodeValue.length;
  }

  if (node.nodeType === 3) {
    return Math.min(total + Math.min(offset, node.nodeValue.length), length);
  }
  for (let i = 0; i < offset && i < node.childNodes.length; i += 1) {
    total += node.childNodes[i].textContent.length;
  }
  return Math.min(total, length);
}

function localSelection(el, range) {
  const length = el.textContent?.length ?? 0;
  try {
    const from =
      range.comparePoint(el, 0) === 0
        ? 0
        : textOffsetWithin(el, range.startContainer, range.startOffset);
    const to =
      range.comparePoint(el, el.childNodes.length) === 0
        ? length
        : textOffsetWithin(el, range.endContainer, range.endOffset);
    return { from: Math.min(from, length), to: Math.min(Math.max(to, from), length) };
  } catch {
    return { from: 0, to: length };
  }
}

function mapBlockSelection(markdown, el, local) {
  const blockStart = Number(el.dataset.cvStart);
  const blockEnd = Number(el.dataset.cvEnd);
  const blockRaw = markdown.slice(blockStart, blockEnd);

  const rendered = el.textContent ?? '';
  const lead = rendered.length - rendered.trimStart().length;
  const text = rendered.trim();
  const from = Math.max(0, Math.min(text.length, local.from - lead));
  const to = Math.max(from, Math.min(text.length, local.to - lead));

  if (from === 0 && to === text.length) {
    const contentStart = Number(el.dataset.cvContentStart ?? blockStart);
    const contentEnd = Number(el.dataset.cvContentEnd ?? blockEnd);
    return { start: contentStart, end: Math.max(contentStart, contentEnd), whole: true };
  }

  const selected = text.slice(from, to);
  if (selected.length === 0) {
    return null;
  }
  const match =
    new RegExp(escapeRegExp(selected)).exec(blockRaw) ?? buildLoosePattern(selected).exec(blockRaw);
  if (!match) {
    return null;
  }

  const first = selected[0];
  const last = selected[selected.length - 1];
  let start = blockStart + match.index;
  let end = start + match[0].length;
  while (start < end && markdown[start] !== first) {
    start += 1;
  }
  while (end > start && markdown[end - 1] !== last) {
    end -= 1;
  }
  if (start >= end) {
    return null;
  }
  return { start, end, whole: false };
}

export function resolveSelection(paperEl, range, markdown) {
  if (!paperEl || !range || range.collapsed || !markdown) {
    return null;
  }
  if (!paperEl.contains(range.commonAncestorContainer)) {
    return null;
  }

  const blocks = getBlocks(paperEl).filter((el) => {
    try {
      return range.intersectsNode(el);
    } catch {
      return false;
    }
  });
  if (blocks.length === 0) {
    return null;
  }

  const mapped = [];
  for (const el of blocks) {
    const hit = mapBlockSelection(markdown, el, localSelection(el, range));
    if (hit) {
      mapped.push(hit);
    }
  }
  if (mapped.length === 0) {
    return null;
  }

  const start = Math.min(...mapped.map((m) => m.start));
  const end = Math.max(...mapped.map((m) => m.end));
  return {
    start,
    end,
    blockStart: Number(blocks[0].dataset.cvStart),
    blockEnd: Number(blocks[blocks.length - 1].dataset.cvEnd),
    text: range.toString(),
    whole: mapped.every((m) => m.whole) && mapped.length === blocks.length,
  };
}

function rangeFromTextOffsets(root, from, to) {
  const walker = document.createTreeWalker(root, SHOW_TEXT);
  let node;
  let total = 0;
  let startNode = null;
  let startOffset = 0;
  let endNode = null;
  let endOffset = 0;
  while ((node = walker.nextNode())) {
    const length = node.nodeValue.length;
    if (!startNode && total + length > from) {
      startNode = node;
      startOffset = from - total;
    }
    if (total + length >= to) {
      endNode = node;
      endOffset = to - total;
      break;
    }
    total += length;
  }
  if (!startNode || !endNode) {
    return null;
  }
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

export function createRangeForSourceRange(paperEl, range, text) {
  if (!paperEl || !range) {
    return null;
  }
  const blocks = getBlocks(paperEl).filter((el) => {
    const start = Number(el.dataset.cvStart);
    const end = Number(el.dataset.cvEnd);
    return start >= range.start && end <= range.end;
  });
  if (blocks.length > 0) {
    const domRange = document.createRange();
    domRange.setStartBefore(blocks[0]);
    domRange.setEndAfter(blocks[blocks.length - 1]);
    return domRange;
  }

  const needle = (text ?? '').trim();
  if (!needle) {
    return null;
  }
  const haystack = paperEl.textContent ?? '';
  let index = haystack.indexOf(needle);
  if (index === -1) {
    return null;
  }

  const owner = getBlocks(paperEl).find((el) => {
    const start = Number(el.dataset.cvStart);
    return start <= range.start && Number(el.dataset.cvEnd) >= range.start;
  });
  if (owner) {
    const base = textOffsetWithin(paperEl, owner, 0);
    const scoped = haystack.indexOf(needle, base);
    if (scoped !== -1 && scoped < base + (owner.textContent?.length ?? 0)) {
      index = scoped;
    }
  }
  return rangeFromTextOffsets(paperEl, index, index + needle.length);
}
