import { buildPdf } from './pdfBuilder';
import { hashMarkdown } from './atsPdfHistory';

const MAX_ENTRIES = 6;
const cache = new Map();

export function artifactKey(markdown, styles) {
  const layout = {
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    lineHeight: styles.lineHeight,
    primaryColor: styles.primaryColor,
    textColor: styles.textColor,
    subtextColor: styles.subtextColor,
    borderStyle: styles.borderStyle,
    bulletStyle: styles.bulletStyle,
    marginX: styles.marginX,
    marginY: styles.marginY,
    sectionGap: styles.sectionGap,
    itemGap: styles.itemGap,
  };
  return `${hashMarkdown(markdown)}:${hashMarkdown(JSON.stringify(layout))}`;
}

export function getPdfArtifact(markdown, styles, options = {}) {
  const key = artifactKey(markdown, styles);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const { blob, pages, model, bytes } = buildPdf(markdown, styles, options);
  const artifact = { key, blob, pages, model, bytes, styles: { ...styles } };

  cache.set(key, artifact);
  if (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  return artifact;
}

export function peekPdfArtifact(markdown, styles) {
  return cache.get(artifactKey(markdown, styles)) || null;
}

export function clearPdfArtifacts() {
  cache.clear();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
