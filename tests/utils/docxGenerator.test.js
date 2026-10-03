import { describe, it, expect } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { extractDocBlocks, blocksToPlainText } from '../../src/utils/docxBlocks';
import { buildRTF, buildDocx } from '../../src/utils/docxGenerator';


function readZipEntry(bytes, wanted) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset < bytes.length - 4) {
    if (view.getUint32(offset, true) !== 0x04034b50) {
      break;
    }
    const method = view.getUint16(offset + 8, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + size);
    if (name === wanted) {
      return new TextDecoder().decode(method === 0 ? data : inflateRawSync(data));
    }
    offset = start + size;
  }
  throw new Error(`the package has no ${wanted}`);
}

const styles = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  lineHeight: 1.48,
  marginX: 28,
  marginY: 24,
  sectionGap: 16,
  itemGap: 10,
  primaryColor: '#1e293b',
  textColor: '#1e293b',
  subtextColor: '#475569',
  borderStyle: 'line',
  bulletStyle: '•',
};

const CV = `# Ana Gomez

ana@mail.com | +34 600 000 000 | [linkedin.com/in/ana](https://linkedin.com/in/ana)

## EXPERIENCE

### Acme Corp | 2020 - 2024

- Led the migration **cutting deploys by 45%**
- Rebuilt the billing service with __legacy clients__ in mind

## EDUCATION

### BSc Computer Science | 2015 - 2019
`;

describe('docxBlocks', () => {
  it('reads the document as the flat block list an office file needs', () => {
    const blocks = extractDocBlocks(CV);
    expect(blocks.map((block) => block.kind)).toEqual([
      'name',
      'paragraph',
      'section',
      'entry',
      'bullet',
      'bullet',
      'section',
      'entry',
    ]);
    expect(blocks[1].runs.map((run) => run.text).join('')).toBe(
      'ana@mail.com | +34 600 000 000 | linkedin.com/in/ana',
    );
  });

  it('keeps the link of a run so the exported file is clickable', () => {
    const [, contact] = extractDocBlocks(CV);

    expect(contact.runs.some((run) => run.link === 'https://linkedin.com/in/ana')).toBe(true);
    expect(contact.runs.some((run) => run.link === 'mailto:ana@mail.com')).toBe(true);
  });

  it('splits a "Title | Date" heading into two parts', () => {
    const blocks = extractDocBlocks(CV);
    const entry = blocks.find((block) => block.kind === 'entry');
    expect(entry.parts.map((part) => part.map((run) => run.text).join(''))).toEqual([
      'Acme Corp',
      '2020 - 2024',
    ]);
  });

  it('carries the emphasis of the source', () => {
    const bullet = extractDocBlocks(CV).find((block) => block.kind === 'bullet');
    expect(bullet.runs.find((run) => run.bold)?.text).toContain('cutting deploys');
    expect(bullet.runs.find((run) => run.underline || run.strike || run.bold)?.text).toBeTruthy();
  });

  it('turns a <br> separator into empty space instead of markup', () => {
    const blocks = extractDocBlocks('# Ana\n\n## SKILLS\n\nReact\n\n<br>\n\n## EDUCATION\n\nBSc');
    expect(blocks.map((block) => block.kind)).toEqual([
      'name',
      'section',
      'paragraph',
      'spacer',
      'section',
      'paragraph',
    ]);
    expect(blocksToPlainText(blocks)).not.toContain('<br>');
  });

  it('never returns anything for empty content', () => {
    expect(extractDocBlocks('')).toEqual([]);
    expect(extractDocBlocks(null)).toEqual([]);
    expect(blocksToPlainText([])).toBe('');
  });
});

describe('buildRTF', () => {
  it('writes a valid RTF envelope with the readable text inside', () => {
    const rtf = buildRTF(CV, styles);
    expect(rtf.startsWith('{\\rtf1')).toBe(true);
    expect(rtf.endsWith('}')).toBe(true);
    expect(rtf).toContain('Ana Gomez');
    expect(rtf).toContain('EXPERIENCE');
    expect(rtf).toContain('\\bullet');

    const opens = rtf.replace(/\\[{}]/g, '').match(/{/g)?.length || 0;
    const closes = rtf.replace(/\\[{}]/g, '').match(/}/g)?.length || 0;
    expect(opens).toBe(closes);
  });

  it('escapes the characters that would end a group early', () => {
    const rtf = buildRTF('# Ana {Inc}\n\nPath C:\\cv', styles);
    expect(rtf).toContain('\\{Inc\\}');
    expect(rtf).toContain('C:\\\\cv');
  });
});

describe('buildDocx', () => {
  it('produces a real OOXML package, not a renamed RTF', async () => {
    const { blob, filename, text } = await buildDocx(CV, styles, 'CV_ATS.docx');
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(filename).toBe('CV_ATS.docx');
    expect(blob.size).toBeGreaterThan(1000);

    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    expect(Array.from(header)).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(text).toContain('Ana Gomez');
  });

  it('writes the text, the links and the margins of the layout', async () => {
    const { blob } = await buildDocx(CV, styles);
    const document = readZipEntry(new Uint8Array(await blob.arrayBuffer()), 'word/document.xml');
    expect(document).toContain('Acme Corp');
    expect(document).toContain('2020 - 2024');

    const rels = readZipEntry(
      new Uint8Array(await blob.slice(0).arrayBuffer()),
      'word/_rels/document.xml.rels',
    );
    expect(rels).toContain('https://linkedin.com/in/ana');
    expect(document).toContain('w:left="420"');
    expect(document).toContain('w:right="420"');
  });
});
