const INLINE_MARKERS = {
  bold: '**',
  italic: '*',
  underline: '__',
  strikethrough: '~~',
  code: '`',
};

const HEADING_RE = /^(\s*)(#{1,6})\s+/;
const ALIGN_OPEN_RE = /<div\s+align="(left|center|right)"\s*>\s*$/i;
const ALIGN_CLOSE_RE = /^\s*<\/div>/i;

function isValidSelection(range) {
  return Boolean(range) && Number.isFinite(range.start) && Number.isFinite(range.end);
}

function blockBounds(range) {
  return {
    from: Number.isFinite(range.blockStart) ? range.blockStart : range.start,
    to: Number.isFinite(range.blockEnd) ? range.blockEnd : range.end,
  };
}

function buildResult(markdown, from, to, next, selection) {
  return {
    markdown: markdown.slice(0, from) + next + markdown.slice(to),
    range: {
      start: selection.start,
      end: selection.end,
      blockStart: selection.blockStart,
      blockEnd: selection.blockEnd,
    },
  };
}

export function replaceRange(markdown, range, insertion) {
  const text = String(markdown ?? '');
  if (!isValidSelection(range)) {
    return null;
  }
  const from = Math.max(0, Math.min(range.start, text.length));
  const to = Math.max(from, Math.min(range.end, text.length));
  const next = String(insertion ?? '');
  return buildResult(markdown, from, to, next, {
    ...range,
    start: from,
    end: from + next.length,
  });
}

function findMarkerRuns(text, marker, from, to) {
  const runs = [];
  const size = marker.length;
  for (let i = 0; i < text.length; i += 1) {
    if (!text.startsWith(marker, i)) {
      continue;
    }
    if (size === 1 && text[i - 1] === marker) {
      continue;
    }
    const close = text.indexOf(marker, i + size);
    if (close < i + size + 1) {
      continue;
    }
    if (size === 1 && text[close + 1] === marker) {
      continue;
    }
    if (i >= to || close + size <= from) {
      i = close + size - 1;
      continue;
    }
    runs.push({ start: i, end: close + size });
    i = close + size - 1;
  }
  return runs;
}

function stripMarkerRuns(text, marker) {
  const runs = findMarkerRuns(text, marker, 0, text.length);
  let out = '';
  let cursor = 0;
  for (const run of runs) {
    out += text.slice(cursor, run.start);
    out += text.slice(run.start + marker.length, run.end - marker.length);
    cursor = run.end;
  }
  return out + text.slice(cursor);
}

function isRangeCovered(runs, start, end) {
  if (runs.length === 0) {
    return false;
  }
  let cursor = start;
  for (const run of [...runs].sort((a, b) => a.start - b.start)) {
    if (run.start > cursor) {
      return false;
    }
    cursor = Math.max(cursor, run.end);
  }
  return cursor >= end;
}

function expandLink(markdown, start, end) {
  let from = start;
  let to = end;
  while (from > 0 && markdown[from - 1] === '[') {
    from -= 1;
  }
  if (markdown[to] === ']') {
    const close = markdown.indexOf(')', to);
    if (close !== -1) {
      to = close + 1;
    }
  }
  return { start: from, end: to };
}

export function isInlineActive(markdown, range, type) {
  const marker = INLINE_MARKERS[type];
  if (!marker || !isValidSelection(range) || range.end <= range.start) {
    return false;
  }
  return isRangeCovered(
    findMarkerRuns(markdown, marker, range.start, range.end),
    range.start,
    range.end,
  );
}

export function applyInlineFormat(markdown, range, type) {
  const marker = INLINE_MARKERS[type];
  if (!marker || !isValidSelection(range) || range.end <= range.start) {
    return null;
  }

  const runs = findMarkerRuns(markdown, marker, range.start, range.end);
  const grown = expandLink(markdown, range.start, range.end);
  const from = runs.reduce((min, run) => Math.min(min, run.start), grown.start);
  const to = runs.reduce((max, run) => Math.max(max, run.end), grown.end);
  const body = stripMarkerRuns(markdown.slice(from, to), marker);
  if (!body) {
    return null;
  }

  if (isRangeCovered(runs, range.start, range.end)) {
    return buildResult(markdown, from, to, body, {
      ...range,
      start: from,
      end: from + body.length,
    });
  }

  return buildResult(markdown, from, to, marker + body + marker, {
    ...range,
    start: from + marker.length,
    end: from + marker.length + body.length,
  });
}

export function applyLink(markdown, range, url) {
  const href = String(url ?? '').trim();
  if (!href || !isValidSelection(range) || range.end <= range.start) {
    return null;
  }

  const target =
    markdown[range.start - 1] === '[' && markdown[range.end] === ']'
      ? expandLink(markdown, range.start - 1, range.end)
      : { start: range.start, end: range.end };
  const body = markdown.slice(target.start, target.end);
  if (!body) {
    return null;
  }
  const next = `[${body}](${href})`;
  return buildResult(markdown, target.start, target.end, next, {
    ...range,
    start: target.start + 1,
    end: target.start + 1 + body.length,
  });
}

function splitLine(line) {
  const indent = /^\s*/.exec(line)[0];
  const rest = line.slice(indent.length);
  const prefix = /^(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)/.exec(rest);
  return { indent, body: prefix ? rest.slice(prefix[0].length) : rest };
}

function getBlockKind(line) {
  if (HEADING_RE.test(line)) {
    return 'heading';
  }
  if (/^(\s*)[-*+]\s+/.test(line)) {
    return 'bullet';
  }
  if (/^(\s*)\d+[.)]\s+/.test(line)) {
    return 'ordered';
  }
  return 'paragraph';
}

function findAlignWrapper(markdown, start, end) {
  const open = ALIGN_OPEN_RE.exec(markdown.slice(0, start));
  const close = ALIGN_CLOSE_RE.exec(markdown.slice(end));
  const from = open ? start - open[0].length : start;
  const to = close ? end + close[0].length : end;
  return {
    start: from,
    end: to,
    innerStart: open ? start : from,
    innerEnd: close ? end : to,
    align: open ? open[1].toLowerCase() : null,
  };
}

export function getBlockState(markdown, range) {
  if (!isValidSelection(range)) {
    return { heading: 0, list: null, align: null };
  }
  const { from, to } = blockBounds(range);
  const firstLine = markdown.slice(from, to).split('\n')[0] || '';
  const heading = HEADING_RE.exec(firstLine);
  const kind = getBlockKind(firstLine);
  return {
    heading: heading ? heading[2].length : 0,
    list: kind === 'bullet' || kind === 'ordered' ? kind : null,
    align: findAlignWrapper(markdown, from, to).align,
  };
}

function buildBlockResult(markdown, range, next) {
  const { from, to } = blockBounds(range);
  return {
    markdown: markdown.slice(0, from) + next + markdown.slice(to),
    range: { start: from, end: from + next.length, blockStart: from, blockEnd: from + next.length },
  };
}

function blockLines(markdown, range) {
  const { from, to } = blockBounds(range);
  return markdown.slice(from, to).split('\n');
}

export function applyHeading(markdown, range, level) {
  if (!isValidSelection(range)) {
    return null;
  }
  const lines = blockLines(markdown, range);
  const { indent, body } = splitLine(lines[0]);
  const current = HEADING_RE.exec(lines[0]);
  if (current && current[2].length === level) {
    lines[0] = body;
  } else {
    lines[0] = body ? `${indent}${'#'.repeat(level)} ${body}` : '';
  }
  return buildBlockResult(markdown, range, lines.join('\n'));
}

export function applyList(markdown, range, kind) {
  if (!isValidSelection(range)) {
    return null;
  }
  const lines = blockLines(markdown, range);
  const touched = lines.filter((line) => line.trim().length > 0);
  if (touched.length === 0) {
    return null;
  }
  const turnOff = touched.every((line) => getBlockKind(line) === kind);
  let counter = 0;
  const next = lines.map((line) => {
    if (line.trim().length === 0) {
      return line;
    }
    const { indent, body } = splitLine(line);
    if (turnOff) {
      return body;
    }
    counter += 1;
    return kind === 'bullet' ? `${indent}- ${body}` : `${indent}${counter}. ${body}`;
  });
  return buildBlockResult(markdown, range, next.join('\n'));
}

function replaceWrapped(markdown, wrapper, next, range) {
  const leading = next.length - next.trimStart().length;
  const trailing = next.length - next.trimEnd().length;
  const innerStart = wrapper.start + leading;
  const innerEnd = wrapper.start + next.length - trailing;

  const head = markdown.slice(0, wrapper.start);
  const tail = markdown.slice(wrapper.end);
  const open = head.length > 0 && !/\s$/.test(head) ? '\n\n' : '';
  const close = tail.length > 0 && !/^\s/.test(tail) ? '\n\n' : '';
  return {
    markdown: head + open + next + close + tail,
    range: {
      ...range,
      start: innerStart + open.length,
      end: innerEnd + open.length,
      blockStart: innerStart + open.length,
      blockEnd: innerEnd + open.length,
    },
  };
}

export function applyAlign(markdown, range, align) {
  if (!isValidSelection(range)) {
    return null;
  }
  const { from, to } = blockBounds(range);
  const wrapper = findAlignWrapper(markdown, from, to);
  const inner = markdown.slice(wrapper.innerStart, wrapper.innerEnd).trim();
  if (!inner) {
    return null;
  }
  if (wrapper.align === align) {
    return replaceWrapped(markdown, wrapper, inner, range);
  }
  return replaceWrapped(markdown, wrapper, `<div align="${align}">\n\n${inner}\n\n</div>`, range);
}

export function clearFormatting(markdown, range) {
  if (!isValidSelection(range)) {
    return null;
  }
  const { from, to } = blockBounds(range);
  const wrapper = findAlignWrapper(markdown, from, to);
  const lines = markdown.slice(wrapper.innerStart, wrapper.innerEnd).split('\n');
  const next = lines
    .map((line) => {
      if (line.trim().length === 0) {
        return line;
      }
      const { indent, body } = splitLine(line);
      let plain = stripMarkerRuns(body, '**');
      plain = stripMarkerRuns(plain, '__');
      plain = stripMarkerRuns(plain, '~~');
      plain = stripMarkerRuns(plain, '*');
      plain = stripMarkerRuns(plain, '`');
      return indent + plain;
    })
    .join('\n');
  return replaceWrapped(markdown, wrapper, next, range);
}
