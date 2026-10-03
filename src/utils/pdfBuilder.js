import { jsPDF } from 'jspdf';
import { buildPdfModel, resolveFontFamily, sanitizeForPdf } from './pdfModel';

const PAGE = { width: 595.28, height: 841.89 };

function fontOf(family, run) {
  const base = resolveFontFamily(run?.mono ? 'monospace' : family);
  const style =
    run?.bold && run?.italic
      ? 'bolditalic'
      : run?.bold
        ? 'bold'
        : run?.italic
          ? 'italic'
          : 'normal';
  return { base, style };
}

function applyFont(doc, family, run, size) {
  const { base, style } = fontOf(family, run);
  doc.setFont(base, style);
  doc.setFontSize(size);
}

function layoutLines(doc, runs, size, maxWidth, family) {
  const lines = [];
  let line = [];
  let width = 0;

  for (const run of runs) {
    if (run.text === '\n') {
      lines.push({ runs: line, width });
      line = [];
      width = 0;
      continue;
    }

    const chunks = run.text.split(/(\s+)/).filter((chunk) => chunk !== '');
    for (const chunk of chunks) {
      const probe = { ...run, text: chunk };
      applyFont(doc, family, probe, probe.size || size);
      const chunkWidth = doc.getTextWidth(chunk);
      if (width + chunkWidth > maxWidth && line.length > 0 && chunk.trim() !== '') {
        lines.push({ runs: line, width });
        line = [];
        width = 0;
      }
      line.push(probe);
      width += chunkWidth;
    }
  }
  lines.push({ runs: line, width });
  return lines;
}

function drawRunDecorations(doc, run, x, y, size) {
  if (run.underline) {
    doc.setDrawColor(...run.color);
    doc.setLineWidth(Math.max(0.4, size * 0.05));
    doc.line(x, y + size * 0.14, x + run.width, y + size * 0.14);
  }
  if (run.strike) {
    doc.setDrawColor(...run.color);
    doc.setLineWidth(Math.max(0.4, size * 0.05));
    doc.line(x, y - size * 0.28, x + run.width, y - size * 0.28);
  }
}

export function renderPdfDocument(markdown, styles, options = {}) {
  const model = buildPdfModel(markdown, styles);
  const doc =
    options.doc || new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  const family = styles.fontFamily;
  const { marginX, marginY, base, lineHeight, sectionGap, itemGap, indent } = model.metrics;
  const colors = model.colors;
  const colorOf = (name) => colors[name] || colors.text;
  const contentWidth = PAGE.width - marginX * 2;

  let y = marginY;
  let page = 1;
  const ensureSpace = (height) => {
    if (y + height > PAGE.height - marginY) {
      doc.addPage();
      page += 1;
      y = marginY;
      return true;
    }
    return false;
  };

  for (const block of model.blocks) {
    if (block.kind === 'spacer') {
      const height = lineHeight * (block.lines || 1);
      ensureSpace(height);
      y += height;
      continue;
    }

    if (block.kind === 'rule') {
      ensureSpace(itemGap);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.75);
      doc.line(marginX, y + 2, PAGE.width - marginX, y + 2);
      y += itemGap * 0.9;
      continue;
    }

    if (block.kind === 'list') {
      for (const [index, item] of block.items.entries()) {
        const lines = layoutLines(doc, item, base, contentWidth - indent, family);
        const height = lines.length * lineHeight;
        ensureSpace(height);

        const marker = block.ordered
          ? `${block.start + index}.`
          : sanitizeForPdf(options.bullet || '\u2022', '\u2022');
        doc.setFont(resolveFontFamily(family), 'normal');
        doc.setFontSize(base);
        doc.setTextColor(...colorOf('subtext'));
        doc.text(marker, marginX, y);
        drawBlockLines(
          doc,
          lines,
          marginX + indent,
          y,
          base,
          lineHeight,
          family,
          colorOf(block.color),
          contentWidth - indent,
          block.align,
        );
        y += height + 2;
      }
      y += itemGap * 0.4;
      continue;
    }

    const size =
      block.kind === 'name'
        ? block.name
        : block.kind === 'section'
          ? block.section
          : block.kind === 'entry'
            ? block.entry
            : base;
    const isSection = block.kind === 'section';
    const gapBefore = block.kind === 'name' ? 0 : isSection ? sectionGap : itemGap * 0.5;
    const lines = layoutLines(doc, block.runs, size, contentWidth, family);
    const badge = isSection && block.border === 'badge';
    const blockLineHeight = size * (block.kind === 'name' ? 1.15 : block.lineHeight / base);
    const height = lines.length * blockLineHeight + (badge ? 8 : 0);

    y += gapBefore;
    ensureSpace(height);
    if (badge) {
      doc.setFillColor(...colorOf('primary'));
      doc.rect(marginX, y - size, contentWidth, height, 'F');
    }
    drawBlockLines(
      doc,
      lines,
      marginX,
      y,
      size,
      blockLineHeight,
      family,
      badge ? [255, 255, 255] : colorOf(block.color),
      contentWidth,
      block.align,
    );

    if (isSection && block.border && block.border !== 'badge') {
      const ruleY = y + blockLineHeight * lines.length - size * 0.45;
      doc.setDrawColor(...(block.border === 'minimal' ? colors.border : colorOf('primary')));
      doc.setLineWidth(block.border === 'double' ? 1.2 : block.border === 'thick-left' ? 2.4 : 0.9);
      if (block.border === 'thick-left') {
        doc.line(marginX, y - size, marginX, y + blockLineHeight * lines.length);
      } else if (block.border === 'double') {
        doc.line(marginX, ruleY, PAGE.width - marginX, ruleY);
        doc.line(marginX, ruleY + 2, PAGE.width - marginX, ruleY + 2);
      } else {
        doc.line(marginX, ruleY, PAGE.width - marginX, ruleY);
      }
    }
    y += height + (isSection ? 4 : 0);
  }

  return { doc, pages: page, model };
}

function drawBlockLines(doc, lines, left, top, size, lineHeight, family, color, maxWidth, align) {
  lines.forEach((line, index) => {
    let x = left;
    if (align === 'center') {
      x += Math.max(0, (maxWidth - line.width) / 2);
    } else if (align === 'right') {
      x += Math.max(0, maxWidth - line.width);
    }
    const baseline = top + index * lineHeight;
    for (const run of line.runs) {
      applyFont(doc, family, run, size);
      doc.setTextColor(...color);
      doc.text(run.text, x, baseline);
      run.width = doc.getTextWidth(run.text);
      drawRunDecorations(doc, { ...run, color }, x, baseline, size);
      x += run.width;
    }
  });
}

export function buildPdf(markdown, styles, options = {}) {
  const { doc, pages, model } = renderPdfDocument(markdown, styles, options);
  const blob = doc.output('blob');
  return { doc, blob, pages, model, bytes: blob.size };
}

export function fitToPages(markdown, styles, options = {}) {
  const targetPages = options.targetPages || 1;
  const round2 = (value) => Math.round(value * 100) / 100;
  const pagesOf = (candidate) => renderPdfDocument(markdown, candidate, options).pages;
  const originalPages = pagesOf(styles);
  if (originalPages <= targetPages) {
    return { styles, pages: originalPages, originalPages, changed: false, steps: [] };
  }

  const floors = {
    lineHeight: 1.2,
    sectionGap: 6,
    itemGap: 4,
    marginX: 16,
    marginY: 14,
    fontSize: 9,
  };
  const steps = [];
  let candidate = { ...styles };
  const reduce = (patch, label) => {
    candidate = { ...candidate, ...patch };
    const pages = pagesOf(candidate);
    steps.push({ label, value: Object.values(patch)[0], pages });
    return pages <= targetPages;
  };

  while (
    candidate.lineHeight > floors.lineHeight &&
    !reduce(
      { lineHeight: Math.max(floors.lineHeight, round2(candidate.lineHeight - 0.03)) },
      'lineHeight',
    )
  ) {}

  while (
    (candidate.sectionGap > floors.sectionGap || candidate.itemGap > floors.itemGap) &&
    !reduce(
      {
        sectionGap: Math.max(floors.sectionGap, candidate.sectionGap - 2),
        itemGap: Math.max(floors.itemGap, candidate.itemGap - 1),
      },
      'gaps',
    )
  ) {}

  while (
    (candidate.marginX > floors.marginX || candidate.marginY > floors.marginY) &&
    !reduce(
      {
        marginX: Math.max(floors.marginX, candidate.marginX - 2),
        marginY: Math.max(floors.marginY, candidate.marginY - 2),
      },
      'margins',
    )
  ) {}

  let guard = 0;
  while (candidate.fontSize > floors.fontSize && guard < 16) {
    if (
      reduce({ fontSize: Math.max(floors.fontSize, round2(candidate.fontSize - 0.25)) }, 'fontSize')
    ) {
      break;
    }
    guard += 1;
  }

  const pages = pagesOf(candidate);
  const changed = pages <= targetPages && layoutDiffers(styles, candidate);
  return {
    styles: changed ? candidate : styles,
    pages: changed ? pages : originalPages,
    originalPages,
    changed,
    steps,
  };
}

function layoutDiffers(a, b) {
  return ['fontSize', 'lineHeight', 'marginX', 'marginY', 'sectionGap', 'itemGap'].some(
    (key) => a[key] !== b[key],
  );
}
