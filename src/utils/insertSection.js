import { listSections } from './markdownSections';

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const sameTitle = (title, candidates) => {
  const target = normalize(title);
  return candidates.some((candidate) => normalize(candidate) === target);
};

function buildInsertion(source, at, heading, body, meta = {}) {
  const before = source.slice(0, at).replace(/\s+$/, '');
  const after = source.slice(at).replace(/^\s+/, '');
  const block = heading ? `## ${heading}\n\n${body}` : body;
  const head = before ? `${before}\n\n` : '';
  const gap = after ? '\n\n' : '\n';

  const insertedAt = head.length;
  const caret = insertedAt + block.length;
  return {
    markdown: `${head}${block}${gap}${after}`,
    caret,
    insertedAt,
    merged: false,
    ...meta,
  };
}

export function insertSection(markdown, block, caret) {
  const source = String(markdown || '');
  if (!block?.body) {
    return null;
  }
  const sections = listSections(source);
  const body = String(block.body).replace(/\s+$/, '');
  const known = [block.heading, ...(block.aliases || [])].filter(Boolean);

  const existing = sections.find((section) => sameTitle(section.title, known));
  if (existing) {
    return buildInsertion(source, existing.end, null, body, {
      merged: true,
      title: existing.title,
    });
  }

  const point = Number.isFinite(caret)
    ? Math.max(0, Math.min(caret, source.length))
    : source.length;
  const headerEnd = sections.length ? sections[0].start : source.length;
  const inHeader = point < headerEnd;
  const before = source.slice(0, point);
  const after = source.slice(point);

  const onBoundary =
    point === 0 || point >= source.length || /\n[ \t]*$/.test(before) || /^#{1,6} /.test(after);
  const at = inHeader
    ? headerEnd
    : onBoundary
      ? point
      : (sections.find((s) => point > s.start && point <= s.end)?.end ?? point);

  return buildInsertion(source, at, block.heading, body, {
    merged: false,
    title: block.heading,
  });
}
