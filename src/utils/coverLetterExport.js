import { buildPdf } from './pdfBuilder';
import { downloadBlob } from './pdfArtifact';

export function letterPrintDocument(markdown, styles) {
  const size = styles.fontSize || 13;
  const title = (markdown.match(/^#\s+(.+)$/m) || [])[1] || 'Cover letter';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: ${mm(styles.marginY)} ${mm(styles.marginX)}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: ${px(styles.marginY)} ${px(styles.marginX)};
    font-family: ${styles.fontFamily || 'Arial, sans-serif'};
    font-size: ${size}px; line-height: ${styles.lineHeight || 1.48};
    color: ${styles.textColor || '#1e293b'}; background: #fff;
  }
  h1 { font-size: ${size * 2.1}px; margin: 0 0 4px; color: ${styles.primaryColor || '#1e293b'}; text-align: center; }
  p { margin: 0 0 ${px(styles.sectionGap || 16)}; }
  ul { margin: 0 0 ${px(styles.sectionGap || 16)}; padding-left: ${size * 1.4}px; }
  li { margin-bottom: ${px(styles.itemGap || 10)}; }
  a { color: inherit; }
  strong { font-weight: 700; }
</style></head>
<body>${bodyOf(markdown)}</body></html>`;
}

const mm = (value) => `${Math.max(4, Math.min((value || 24) * 0.264, 30)).toFixed(1)}mm`;
const px = (value) => `${Math.round((value || 16) * 1.05)}px`;
const escapeHtml = (value) =>
  String(value || '').replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
  );

function bodyOf(markdown) {
  return String(markdown || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.every((line) => /^[-*+]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${inline(line.replace(/^[-*+]\s+/, ''))}</li>`).join('')}</ul>`;
      }
      const text = lines.map(inline).join('<br>');
      if (/^#\s+/.test(lines[0])) {
        return `<h1>${text.replace(/^#\s+/, '')}</h1>`;
      }
      if (/^##\s+/.test(lines[0])) {
        return `<h2>${text.replace(/^##\s+/, '')}</h2>`;
      }
      return `<p>${text}</p>`;
    })
    .join('\n');
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function printCoverLetter(markdown, styles) {
  const win = window.open('', '_blank', 'noopener,width=900,height=1200');
  if (!win) {
    return false;
  }
  win.document.write(letterPrintDocument(markdown, styles));
  win.document.close();

  win.addEventListener('load', () => {
    win.focus();
    win.print();
  });
  return true;
}

export function buildCoverLetterPdf(markdown, styles) {
  return buildPdf(markdown, styles, { bullet: styles.bulletStyle });
}

export function downloadCoverLetterPdf(markdown, styles, filename = 'Cover_Letter.pdf') {
  const { blob } = buildCoverLetterPdf(markdown, styles);
  downloadBlob(blob, filename);
  return blob;
}
