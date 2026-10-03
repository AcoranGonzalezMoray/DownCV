import { Lexer } from 'marked';

export const PT_PER_PX = 0.75;

const ALIGN_RE = /<div\s+align="(left|center|right)"\s*>/i;
const CLOSE_DIV_RE = /^<\/div>/i;

const BR_ONLY_RE = /^(?:\s*<br\s*\/?>\s*)+$/i;

const brCount = (raw) => Math.min((String(raw).match(/<br\s*\/?>/gi) || []).length, 3);

const WIN_ANSI_EXTRA = new Set([...'€‚„…†‡ˆ‰Š‹ŒŽ•Žš›œžŸ™', ...'‘’“”–—•']);

export function sanitizeForPdf(text, fallback = '-') {
  let output = '';
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    if (code < 0x80 || code <= 0xff || WIN_ANSI_EXTRA.has(char)) {
      output += char;
    } else {
      output += fallback;
    }
  }
  return output;
}

export function hexToRgb(hex, fallback = [0, 0, 0]) {
  const value = String(hex || '')
    .trim()
    .replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return fallback;
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function resolveFontFamily(fontFamily = '') {
  const family = String(fontFamily).toLowerCase();
  if (/mono|code|courier/.test(family)) {
    return 'courier';
  }
  if (/georgia|times|merriweather|garamond|playfair|palatino|baskerville/.test(family)) {
    return 'times';
  }

  if (/(^|[\s,])serif/.test(family) && !/sans/.test(family)) {
    return 'times';
  }
  return 'helvetica';
}

export function buildMetrics(styles) {
  const base = styles.fontSize * PT_PER_PX;
  return {
    base,
    name: base * 2.1,
    section: base * 1.2,
    entry: base * 1.05,
    small: base * 0.9,
    lineHeight: base * styles.lineHeight,
    sectionGap: styles.sectionGap * PT_PER_PX,
    itemGap: styles.itemGap * PT_PER_PX,
    marginX: styles.marginX * PT_PER_PX,
    marginY: styles.marginY * PT_PER_PX,
    indent: 14 * PT_PER_PX,
  };
}

function styleRuns(tokens, inherited = {}) {
  const runs = [];
  const push = (text, extra) => {
    if (text) {
      runs.push({ ...inherited, ...extra, text: sanitizeForPdf(text, inherited.mono ? '' : '-') });
    }
  };

  for (const token of tokens || []) {
    switch (token.type) {
      case 'text':
        if (token.tokens && token.tokens.length) {
          runs.push(...styleRuns(token.tokens, inherited));
        } else {
          push(decodeEntities(token.text), {});
        }
        break;
      case 'escape':
        push(decodeEntities(token.text), {});
        break;
      case 'strong':
        if (token.raw && token.raw.trimStart().startsWith('__')) {
          runs.push(...styleRuns(token.tokens, { ...inherited, underline: true }));
        } else {
          runs.push(...styleRuns(token.tokens, { ...inherited, bold: true }));
        }
        break;
      case 'em':
        runs.push(...styleRuns(token.tokens, { ...inherited, italic: true }));
        break;
      case 'del':
        runs.push(...styleRuns(token.tokens, { ...inherited, strike: true }));
        break;
      case 'codespan':
        push(token.text, { ...inherited, mono: true });
        break;
      case 'link': {
        const [label] = styleRuns(token.tokens, inherited);
        if (label) {
          runs.push({ ...label, link: true });
        }
        break;
      }
      case 'br':
        runs.push({ ...inherited, text: '\n' });
        break;
      case 'image':
        break;
      case 'html':
        break;
      default:
        if (token.tokens) {
          runs.push(...styleRuns(token.tokens, inherited));
        } else if (token.text) {
          push(token.text, {});
        }
    }
  }
  return runs;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(value = '') {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const hex = code[1] === 'x' || code[1] === 'X';
      return String.fromCodePoint(parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

const textOf = (runs) => runs.map((run) => run.text).join('');

export function buildPdfModel(markdown, styles) {
  const metrics = buildMetrics(styles);
  const tokens = Lexer.lex(markdown || '', { gfm: true, breaks: true });
  const blocks = [];
  let align = 'left';

  const emit = (block) => blocks.push({ align, ...block });

  for (const token of tokens) {
    if (token.type === 'space') {
      continue;
    }
    if (token.type === 'html') {
      const raw = String(token.raw || '').trim();
      const open = ALIGN_RE.exec(raw);
      if (open) {
        align = open[1].toLowerCase();
        const inline = raw.replace(ALIGN_RE, '').replace(CLOSE_DIV_RE, '').trim();
        if (inline) {
          emit({
            kind: 'paragraph',
            runs: styleRuns(Lexer.lexInline(inline)),
            ...metrics,
            color: 'text',
          });
        }
        continue;
      }
      if (CLOSE_DIV_RE.test(raw)) {
        align = 'left';
        continue;
      }
      if (BR_ONLY_RE.test(raw)) {
        emit({ kind: 'spacer', runs: [], lines: brCount(raw), ...metrics });
        continue;
      }
      if (/<img|<table|<script|<iframe/i.test(raw)) {
        emit({
          kind: 'paragraph',
          runs: [{ text: '[contenido no textual]' }],
          ...metrics,
          color: 'subtext',
        });
      }
      continue;
    }
    if (token.type === 'heading') {
      const runs = styleRuns(token.tokens);
      if (token.depth === 1) {
        emit({ kind: 'name', runs, ...metrics, color: 'primary', weight: 700 });
      } else if (token.depth === 2) {
        emit({
          kind: 'section',
          runs: runs.map((run) => ({ ...run, text: run.text.toUpperCase() })),
          ...metrics,
          color: 'primary',
          weight: 700,
          border: styles.borderStyle,
        });
      } else {
        emit({ kind: 'entry', runs, ...metrics, color: 'text', weight: 700 });
      }
      continue;
    }
    if (token.type === 'paragraph') {
      const raw = String(token.raw || '');

      if (BR_ONLY_RE.test(raw.trim())) {
        emit({ kind: 'spacer', runs: [], lines: brCount(raw), ...metrics });
        continue;
      }
      emit({ kind: 'paragraph', runs: styleRuns(token.tokens), ...metrics, color: 'text' });
      const trailing = /((?:<br\s*\/?>\s*)+)$/i.exec(raw);
      if (trailing) {
        emit({ kind: 'spacer', runs: [], lines: brCount(trailing[1]), ...metrics });
      }
      continue;
    }
    if (token.type === 'list') {
      emit({
        kind: 'list',
        ordered: Boolean(token.ordered),
        start: Number(token.start) || 1,
        items: token.items.map((item) => styleRuns(item.tokens)),
        ...metrics,
        color: 'text',
      });
      continue;
    }
    if (token.type === 'hr') {
      emit({ kind: 'rule', runs: [], ...metrics, color: 'border' });
      continue;
    }
    if (token.type === 'blockquote') {
      emit({ kind: 'paragraph', runs: styleRuns(token.tokens), ...metrics, color: 'subtext' });
    }
  }

  return {
    blocks,
    metrics,
    colors: {
      primary: hexToRgb(styles.primaryColor),
      text: hexToRgb(styles.textColor),
      subtext: hexToRgb(styles.subtextColor),
      border: hexToRgb(styles.primaryColor, [200, 200, 200]),
    },
  };
}

export function modelToPlainText(model, options = {}) {
  const bullet = sanitizeForPdf(options.bullet || '•', '•');
  const parts = [];
  for (const block of model.blocks) {
    if (block.kind === 'rule' || block.kind === 'spacer') {
      continue;
    }
    if (block.kind === 'list') {
      block.items.forEach((item, index) => {
        const marker = block.ordered ? `${block.start + index}.` : bullet;
        parts.push(`${marker} ${textOf(item)}`);
      });
      continue;
    }
    const value = textOf(block.runs).trim();
    if (value) {
      parts.push(value);
    }
  }
  return parts.join('\n');
}
