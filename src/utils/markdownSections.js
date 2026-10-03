import { Lexer } from 'marked';

const LEXER_OPTIONS = { gfm: true, breaks: true };

export function listSections(markdown) {
  const source = String(markdown || '');
  if (!source.trim()) {
    return [];
  }
  let tokens = [];
  try {
    tokens = Lexer.lex(source, LEXER_OPTIONS);
  } catch {
    return [];
  }

  const starts = [];
  let cursor = 0;
  for (const token of tokens) {
    const raw = typeof token.raw === 'string' ? token.raw : '';
    if (token.type === 'heading' && token.depth === 2) {
      starts.push({ start: cursor, title: headingText(token) });
    }
    cursor += raw.length;
  }

  return starts.map((entry, index) => ({
    title: entry.title,
    start: entry.start,

    end: index + 1 < starts.length ? starts[index + 1].start : source.length,
  }));
}

function headingText(token) {
  const walk = (tokens) =>
    tokens
      .map((token) => {
        if (token.type === 'text' || token.type === 'escape') {
          return token.tokens?.length ? walk(token.tokens) : token.text || '';
        }
        if (token.tokens?.length) {
          return walk(token.tokens);
        }
        return token.text || '';
      })
      .join('');
  return walk(token.tokens || []).trim();
}

export function documentHeader(markdown) {
  const sections = listSections(markdown);
  return sections.length
    ? String(markdown || '').slice(0, sections[0].start)
    : String(markdown || '');
}

export function moveSection(markdown, fromIndex, toIndex) {
  const source = String(markdown || '');
  const sections = listSections(source);
  if (fromIndex === toIndex || !sections[fromIndex] || sections[toIndex] === undefined) {
    return null;
  }
  const header = source.slice(0, sections[0].start);
  const pieces = sections.map((section) => source.slice(section.start, section.end));
  const [moved] = pieces.splice(fromIndex, 1);
  pieces.splice(toIndex, 0, moved);
  return `${header}${pieces.join('').replace(/\s+$/, '')}\n`;
}

export function sectionIndexAt(sections, offset) {
  if (!sections.length || offset === null || offset === undefined) {
    return -1;
  }
  return sections.findIndex((section) => offset >= section.start && offset < section.end);
}
