import { documentHeader, listSections } from './markdownSections';

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

const profileLines = (text) => {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const name = lines.find((line) => /^#\s+\S/.test(line)) || '';
  const title = lines.find((line) => /^\*\*.+\*\*$/.test(line)) || '';
  const rest = lines.filter((line) => line !== name && line !== title && line !== '<br>');
  const contact = rest.find((line) => line.includes('@') || line.includes('+')) || rest[0] || '';
  return { name, title, contact };
};

function buildProfile(source, template, meta = {}) {
  const header = documentHeader(source);
  const current = profileLines(header);
  const wanted = profileLines(template);
  const kept = {
    name: current.name || wanted.name,
    title: current.title || wanted.title,
    contact: current.contact || wanted.contact,
  };
  const head = [kept.name, kept.title].filter(Boolean).join('\n');
  const block = kept.contact ? `${head}\n\n${kept.contact}` : head;
  const rest = source.slice(header.length).trim();
  const markdown = rest ? `${block}\n\n${rest}\n` : `${block}\n`;
  return {
    markdown,
    caret: block.length,
    insertedAt: 0,
    merged: Boolean(current.name || current.title || current.contact),
    title: meta.title,
    ...meta,
  };
}

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
  if (block.verbatim) {
    return buildProfile(source, block.body, { title: block.heading });
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
  const at =
    block.first || inHeader
      ? headerEnd
      : onBoundary
        ? point
        : (sections.find((s) => point > s.start && point <= s.end)?.end ?? point);

  return buildInsertion(source, at, block.heading, body, {
    merged: false,
    title: block.heading,
  });
}
