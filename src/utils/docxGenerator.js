import { extractDocBlocks, blocksToPlainText } from './docxBlocks';
import { resolveFontFamily, hexToRgb } from './pdfModel';
import { downloadBlob } from './pdfArtifact';

const TWIPS_PER_PX = 15;

const DOCX_FONTS = { helvetica: 'Arial', times: 'Times New Roman', courier: 'Courier New' };

const halfPoints = (px) => Math.max(8, Math.round((px || 13) * 2));
const docxFont = (styles) => DOCX_FONTS[resolveFontFamily(styles.fontFamily)] || 'Arial';

const docxColor = (hex) =>
  hexToRgb(hex)
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

export async function buildDocx(markdown, styles, filename = 'CV_ATS.docx') {
  const {
    AlignmentType,
    Document,
    ExternalHyperlink,
    HeadingLevel,
    Packer,
    Paragraph,
    TabStopType,
    TextRun,
  } = await import('docx');
  const blocks = extractDocBlocks(markdown);
  const font = docxFont(styles);
  const base = halfPoints(styles.fontSize);
  const primary = docxColor(styles.primaryColor);
  const text = docxColor(styles.textColor);
  const subtext = docxColor(styles.subtextColor);

  const contentWidth = Math.round((794 - 2 * (styles.marginX || 28)) * TWIPS_PER_PX);

  const runOptions = (run) => ({
    text: run.text,
    bold: run.bold,
    italics: run.italic,
    strike: run.strike,
    font: run.font === 'mono' ? 'Courier New' : font,
    color: run.color || text,
    size: base,
  });

  const toRuns = (runs, overrides = {}) =>
    runs.flatMap((run) => {
      const options = { ...runOptions(run), ...overrides };
      if (!run.link) {
        return [new TextRun(options)];
      }
      return [
        new ExternalHyperlink({
          link: run.link,
          children: [new TextRun({ ...options, style: 'Hyperlink' })],
        }),
      ];
    });

  const children = [];
  for (const block of blocks) {
    if (block.kind === 'spacer' || block.kind === 'rule') {
      continue;
    }
    if (block.kind === 'name') {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: toRuns(block.runs, {
            bold: true,
            size: Math.round(base * 2.1),
            color: primary,
          }),
        }),
      );
      continue;
    }
    if (block.kind === 'section') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 80 },
          border: { bottom: { style: 'single', size: 6, space: 2, color: primary } },
          children: toRuns(block.runs, {
            bold: true,
            size: Math.round(base * 1.25),
            color: primary,
          }),
        }),
      );
      continue;
    }
    if (block.kind === 'entry') {
      const options = { spacing: { before: 100, after: 20 } };
      children.push(
        new Paragraph({
          ...options,
          tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
          children:
            block.parts && block.parts.length === 2
              ? [
                  ...toRuns(block.parts[0], { bold: true }),
                  new TextRun({ text: '\t' }),
                  ...toRuns(block.parts[1], { color: subtext }),
                ]
              : toRuns(block.runs, { bold: true }),
        }),
      );
      continue;
    }
    if (block.kind === 'bullet') {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 20 },
          children: toRuns(block.runs, { color: subtext }),
        }),
      );
      continue;
    }
    if (block.kind === 'quote') {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 40 },
          children: toRuns(block.runs, { italics: true, color: subtext }),
        }),
      );
      continue;
    }
    children.push(new Paragraph({ spacing: { after: 60 }, children: toRuns(block.runs) }));
  }

  const document = new Document({
    creator: 'DownCV',
    title: blocksToPlainText(blocks).split('\n')[0] || 'CV',
    description: 'Generated with DownCV',
    styles: {
      default: {
        document: { run: { font, size: base, color: text } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: Math.round((styles.marginY || 24) * TWIPS_PER_PX),
              bottom: Math.round((styles.marginY || 24) * TWIPS_PER_PX),
              left: Math.round((styles.marginX || 28) * TWIPS_PER_PX),
              right: Math.round((styles.marginX || 28) * TWIPS_PER_PX),
            },
          },
        },
        children: children.length
          ? children
          : [new Paragraph({ children: [new TextRun({ text: ' ' })] })],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  return { blob, filename, text: blocksToPlainText(blocks) };
}

export async function generateDOCX(markdown, styles, filename = 'CV_ATS.docx') {
  try {
    const { blob, filename: name } = await buildDocx(markdown, styles, filename);
    downloadBlob(blob, name);
    return true;
  } catch {
    return false;
  }
}

function rtfEscape(text) {
  return String(text)
    .replace(/[\\{}]/g, (char) => `\\${char}`)
    .replace(/[^\x20-\x7e\n]/g, (char) => `\\u${char.charCodeAt(0)}?`);
}

export function buildRTF(markdown, styles) {
  const blocks = extractDocBlocks(markdown);
  const fs = halfPoints(styles.fontSize);
  const color = (hex) => {
    const [r, g, b] = hexToRgb(hex);
    return `\\red${r}\\green${g}\\blue${b}`;
  };
  let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\fonttbl{\\f0 Arial;{\\f1 Courier New;}}\\viewkind4\\uc1\\pard\\f0\\fs${fs}\n`;

  const escapeRuns = (runs) =>
    runs.map((run) => (run.bold ? `\\b ${rtfEscape(run.text)}\\b0` : rtfEscape(run.text))).join('');

  for (const block of blocks) {
    if (block.kind === 'spacer' || block.kind === 'rule') {
      rtf += `\\par\n`;
      continue;
    }
    const runs = escapeRuns(block.runs);
    if (block.kind === 'name') {
      rtf += `\\qc\\b\\fs${Math.round(fs * 2.1)} ${runs}\\b0\\fs${fs}\\ql\n`;
    } else if (block.kind === 'section') {
      rtf += `\\pard\\b\\fs${Math.round(fs * 1.25)} ${color(styles.primaryColor)}${runs}\\b0\\fs${fs}\\par\n`;
    } else if (block.kind === 'entry') {
      const dates =
        block.parts && block.parts.length === 2 ? `\\tab ${escapeRuns(block.parts[1])}` : '';
      rtf += `\\pard\\li0\\fi0\\b ${runs}${dates}\\b0\\fs${fs}\\par\n`;
    } else if (block.kind === 'bullet') {
      rtf += `\\pard\\li360\\fi-180\\bullet ${runs}\\par\n`;
    } else {
      rtf += `\\pard ${runs}\\par\n`;
    }
  }
  return `${rtf}}`;
}

export function generateRTF(markdown, styles, filename = 'CV_ATS.rtf') {
  try {
    const blob = new Blob([buildRTF(markdown, styles)], { type: 'application/rtf' });
    downloadBlob(blob, filename);
    return true;
  } catch {
    return false;
  }
}
