import { Lexer } from 'marked';

const LEXER_OPTIONS = { gfm: true, breaks: true };

function inlineRuns(tokens, inherited = {}) {
  const runs = [];
  for (const token of tokens || []) {
    if (token.type === 'text' || token.type === 'escape') {
      if (token.tokens?.length) {
        runs.push(...inlineRuns(token.tokens, inherited));
      } else if (token.text) {
        runs.push({ text: token.text, ...inherited });
      }
      continue;
    }
    if (token.type === 'strong') {
      runs.push(...inlineRuns(token.tokens, { ...inherited, bold: true }));
      continue;
    }
    if (token.type === 'em') {
      runs.push(...inlineRuns(token.tokens, { ...inherited, italic: true }));
      continue;
    }
    if (token.type === 'del' || token.type === 's') {
      runs.push(...inlineRuns(token.tokens, { ...inherited, strike: true }));
      continue;
    }
    if (token.type === 'codespan') {
      runs.push({ text: token.text, ...inherited, font: 'mono' });
      continue;
    }
    if (token.type === 'br') {
      runs.push({ text: '\n', ...inherited });
      continue;
    }
    if (token.type === 'link') {
      runs.push(...inlineRuns(token.tokens, { ...inherited, link: token.href }));
      continue;
    }
    if (token.tokens?.length) {
      runs.push(...inlineRuns(token.tokens, inherited));
    } else if (token.text) {
      runs.push({ text: token.text, ...inherited });
    }
  }
  return runs;
}

const normalizeRuns = (runs) =>
  runs
    .map((run) => ({ ...run, text: String(run.text || '').replace(/\u00a0/g, ' ') }))
    .filter((run) => run.text.length > 0);

const runsText = (runs) => runs.map((run) => run.text).join('');

export function blocksToPlainText(blocks) {
  return blocks
    .filter((block) => block.kind !== 'spacer' && block.kind !== 'rule')
    .map((block) => (block.kind === 'bullet' ? `- ${runsText(block.runs)}` : runsText(block.runs)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractDocBlocks(markdown) {
  if (!markdown) {
    return [];
  }
  let tokens = [];
  try {
    tokens = Lexer.lex(String(markdown), LEXER_OPTIONS);
  } catch {
    return [];
  }

  const blocks = [];
  for (const token of tokens) {
    if (token.type === 'space') {
      continue;
    }
    if (token.type === 'html') {
      const raw = String(token.raw || '').trim();

      if (/^(?:\s*<br\s*\/?>\s*)+$/i.test(raw)) {
        blocks.push({ kind: 'spacer', runs: [] });
      }
      continue;
    }
    if (token.type === 'hr') {
      blocks.push({ kind: 'rule', runs: [] });
      continue;
    }
    if (token.type === 'heading') {
      const runs = normalizeRuns(inlineRuns(token.tokens));
      if (!runs.length) {
        continue;
      }
      if (token.depth === 1) {
        blocks.push({ kind: 'name', runs });
        continue;
      }
      if (token.depth === 2) {
        blocks.push({
          kind: 'section',
          runs: runs.map((run) => ({ ...run, text: run.text.toUpperCase() })),
        });
        continue;
      }

      const text = runsText(runs);
      const pipe = text.indexOf('|');
      if (pipe > 0 && !runs.some((run) => run.link)) {
        const left = normalizeRuns([{ ...runs[0], text: text.slice(0, pipe).trim() }]);
        const right = normalizeRuns([{ ...runs[0], text: text.slice(pipe + 1).trim() }]);
        if (left.length && right.length) {
          blocks.push({ kind: 'entry', runs: left, parts: [left, right] });
          continue;
        }
      }
      blocks.push({ kind: 'entry', runs });
      continue;
    }
    if (token.type === 'paragraph') {
      const raw = String(token.raw || '');
      const onlyBreaks = /^(?:\s*<br\s*\/?>\s*)+$/i.test(raw.trim());
      if (onlyBreaks) {
        blocks.push({ kind: 'spacer', runs: [] });
        continue;
      }
      const runs = normalizeRuns(inlineRuns(token.tokens));
      if (runs.length) {
        blocks.push({ kind: 'paragraph', runs });
      }
      continue;
    }
    if (token.type === 'list') {
      for (const item of token.items || []) {
        const runs = normalizeRuns(inlineRuns(item.tokens));
        if (runs.length) {
          blocks.push({ kind: 'bullet', runs });
        }
      }
      continue;
    }
    if (token.type === 'blockquote') {
      const runs = normalizeRuns(inlineRuns(token.tokens));
      if (runs.length) {
        blocks.push({ kind: 'quote', runs });
      }
      continue;
    }

    if (token.text) {
      const runs = normalizeRuns([{ text: String(token.text).replace(/\s+/g, ' ').trim() }]);
      if (runs.length) {
        blocks.push({ kind: 'paragraph', runs });
      }
    }
  }
  return blocks;
}
