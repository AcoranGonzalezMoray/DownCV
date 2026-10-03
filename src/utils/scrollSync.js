const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function scrollRatio(scrollTop, scrollHeight, clientHeight) {
  const scrollable = Number(scrollHeight) - Number(clientHeight);
  if (!(scrollable > 0)) {
    return 0;
  }
  return clamp01(Number(scrollTop) / scrollable);
}

export function offsetAtRatio(markdown, ratio) {
  const text = String(markdown || '');
  if (!text.length) {
    return 0;
  }
  return Math.round(clamp01(ratio) * text.length);
}

export function ratioAtOffset(markdown, offset) {
  const text = String(markdown || '');
  if (!text.length) {
    return 0;
  }
  return clamp01(Number(offset) / text.length);
}

export function lineAtOffset(markdown, offset) {
  const text = String(markdown || '');
  const at = Math.min(Math.max(0, Number(offset) || 0), text.length);
  let line = 0;
  for (let index = 0; index < at; index += 1) {
    if (text[index] === '\n') {
      line += 1;
    }
  }
  return line;
}

export function offsetAtLine(markdown, line) {
  const text = String(markdown || '');
  if (!text.length) {
    return 0;
  }
  const target = Math.max(0, Number(line) || 0);
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (seen === target) {
      return index;
    }
    if (text[index] === '\n') {
      seen += 1;
    }
  }
  return text.length;
}

export function lineCount(markdown) {
  const text = String(markdown || '');
  return text.length === 0 ? 1 : text.split('\n').length;
}

export function blockAtOffset(root, offset) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return null;
  }
  const at = Number(offset) || 0;
  let found = null;
  root.querySelectorAll('[data-cv-start]').forEach((element) => {
    const start = Number(element.dataset.cvStart);
    const end = Number(element.dataset.cvEnd);
    if (start <= at && (!found || start >= found.start)) {
      found = { start, end, element };
    }
  });
  return found;
}

export const SYNC_LOCK_MS = 220;
