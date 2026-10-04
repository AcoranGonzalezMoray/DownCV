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
  let used = marginY;
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
      const ruleWidth =
        block.border === 'double'
          ? 1.2
          : block.border === 'thick-left'
            ? 2.4
            : block.border === 'minimal'
              ? 0.5
              : 0.9;
      doc.setDrawColor(...(block.border === 'minimal' ? colors.border : colorOf('primary')));
      doc.setLineWidth(ruleWidth);
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
    used = Math.max(used, y);
  }

  const fill = Math.min(1, Math.max(0, (used - marginY) / (PAGE.height - marginY * 2)));
  return { doc, pages: page, model, fill };
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

const FIT_FLOORS = {
  fontSize: 9,
  lineHeight: 1.15,
  sectionGap: 5,
  itemGap: 3,
  marginX: 14,
  marginY: 12,
};

const round2 = (value) => Math.round(value * 100) / 100;

export function scaleLayout(styles, scale) {
  const factor = Math.min(1, Math.max(0, Number(scale) || 0));
  const clamp = (key, value) => Math.max(FIT_FLOORS[key], value);
  return {
    ...styles,
    fontSize: round2(clamp('fontSize', styles.fontSize * factor)),
    lineHeight: round2(clamp('lineHeight', styles.lineHeight * (0.55 + 0.45 * factor))),
    sectionGap: Math.round(clamp('sectionGap', styles.sectionGap * factor)),
    itemGap: Math.round(clamp('itemGap', styles.itemGap * factor)),
    marginX: Math.round(clamp('marginX', styles.marginX * (0.45 + 0.55 * factor))),
    marginY: Math.round(clamp('marginY', styles.marginY * (0.45 + 0.55 * factor))),
  };
}

export function fitToPages(markdown, styles, options = {}) {
  const targetPages = options.targetPages || 1;
  const ceiling = Math.min(1, Math.max(0, options.maxScale ?? 1));
  const pagesOf = (candidate) => renderPdfDocument(markdown, candidate, options).pages;
  const originalPages = pagesOf(styles);
  if (originalPages <= targetPages) {
    return {
      styles,
      pages: originalPages,
      originalPages,
      changed: false,
      reached: true,
      steps: [],
    };
  }

  const steps = [];
  const floorLayout = scaleLayout(styles, 0);
  const floorPages = pagesOf(floorLayout);
  steps.push({ label: 'tightest', pages: floorPages, value: 0 });

  const topLayout = scaleLayout(styles, ceiling);
  const topPages = pagesOf(topLayout);
  steps.push({ label: 'scale', pages: topPages, value: round2(ceiling) });

  let best = topPages <= targetPages ? { styles: topLayout, pages: topPages } : null;
  if (floorPages <= targetPages) {
    let safe = 0;
    let room = best ? ceiling : 1;
    while (room - safe > 0.01) {
      const middle = (safe + room) / 2;
      const candidate = scaleLayout(styles, middle);
      const pages = pagesOf(candidate);
      steps.push({ label: 'scale', pages, value: round2(middle) });
      if (pages <= targetPages) {
        safe = middle;
        best = { styles: candidate, pages };
      } else {
        room = middle;
      }
    }
  }
  if (!best) {
    best = { styles: floorLayout, pages: floorPages };
  }

  const changed = layoutDiffers(styles, best.styles) && best.pages < originalPages;
  return {
    styles: changed ? best.styles : styles,
    pages: changed ? best.pages : originalPages,
    originalPages,
    changed,
    reached: best.pages <= targetPages,
    steps,
  };
}

function layoutDiffers(a, b) {
  return ['fontSize', 'lineHeight', 'marginX', 'marginY', 'sectionGap', 'itemGap'].some(
    (key) => a[key] !== b[key],
  );
}
