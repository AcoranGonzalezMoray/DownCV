import { Lexer, Parser, Renderer } from 'marked';

const OPTIONS = { gfm: true, breaks: true };

const BLOCK_PREFIX_RE = /^\s*(?:(?:#{1,6}|>|[-*+]|\d+[.)])\s+)?/;

function blockAttrs(token) {
  if (!token || typeof token.__cvStart !== 'number') {
    return '';
  }
  return (
    ` data-cv-start="${token.__cvStart}" data-cv-end="${token.__cvEnd}"` +
    ` data-cv-content-start="${token.__cvContentStart}" data-cv-content-end="${token.__cvContentEnd}"`
  );
}

function annotateBlocks(tokens) {
  let cursor = 0;
  for (const token of tokens) {
    const raw = typeof token.raw === 'string' ? token.raw : '';
    const firstLineEnd = raw.indexOf('\n');
    const firstLine = firstLineEnd === -1 ? raw : raw.slice(0, firstLineEnd);
    token.__cvStart = cursor;
    token.__cvEnd = cursor + raw.length;
    token.__cvContentStart = cursor + BLOCK_PREFIX_RE.exec(firstLine)[0].length;
    token.__cvContentEnd = cursor + raw.replace(/\s+$/, '').length;
    cursor += raw.length;
  }
}

class ATSRenderer extends Renderer {
  heading(token) {
    const inner = this.parser.parseInline(token.tokens);
    const attrs = blockAttrs(token);
    if (token.depth === 1) {
      return `<h1 class="cv-name"${attrs}>${inner}</h1>\n`;
    }
    if (token.depth === 2) {
      return `<h3 class="cv-section-title"${attrs}>${inner}</h3>\n`;
    }
    return `<div class="cv-entry-title"${attrs}>${inner}</div>\n`;
  }

  paragraph(token) {
    return `<p${blockAttrs(token)}>${this.parser.parseInline(token.tokens)}</p>\n`;
  }

  strong(token) {
    const inner = this.parser.parseInline(token.tokens);

    if (token.raw && token.raw.startsWith('__')) {
      return `<u>${inner}</u>`;
    }
    return `<strong>${inner}</strong>`;
  }

  list(token) {
    const tag = token.ordered ? 'ol' : 'ul';
    const start = Number(token.start) || 1;
    const startAttr = token.ordered && start !== 1 ? ` start="${start}"` : '';
    const body = token.items.map((item) => this.listitem(item)).join('\n');
    return `<${tag} class="cv-list"${startAttr}${blockAttrs(token)}>${body}</${tag}>\n`;
  }

  hr(token) {
    return `<div class="cv-separator"${blockAttrs(token)}></div>\n`;
  }

  link(token) {
    const href = String(token.href || '').replace(/"/g, '%22');
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${this.parser.parseInline(token.tokens)}</a>`;
  }
}

export function parseMarkdownToATS(markdown) {
  if (!markdown) {
    return '';
  }

  try {
    const tokens = Lexer.lex(markdown, OPTIONS);
    annotateBlocks(tokens);
    return Parser.parse(tokens, { ...OPTIONS, renderer: new ATSRenderer() });
  } catch {
    return '<p class="text-red-500 font-mono">Error al procesar la sintaxis Markdown.</p>';
  }
}
