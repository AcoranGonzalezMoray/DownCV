import { describe, it, expect } from 'vitest';
import {
  checkImportFile,
  importKindOf,
  readDocxText,
  readImportFile,
  readZipEntries,
} from '../../src/utils/importFiles';
import { buildDocx } from '../../src/utils/docxGenerator';

const file = (name, content) => new File([content], name);

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

describe('importKindOf', () => {
  it('decides by extension, and the name is not case sensitive', () => {
    expect(importKindOf({ name: 'cv.PDF' })).toBe('pdf');
    expect(importKindOf({ name: 'cv.docx' })).toBe('docx');
    expect(importKindOf({ name: 'notes.MD' })).toBe('text');
  });
});

describe('checkImportFile', () => {
  it('accepts what the importer can read', () => {
    expect(checkImportFile(file('cv.txt', 'x'))).toEqual({ ok: true, kind: 'text' });
    expect(checkImportFile(file('cv.md', 'x'))).toEqual({ ok: true, kind: 'text' });
    expect(checkImportFile(file('cv.pdf', 'x'))).toEqual({ ok: true, kind: 'pdf' });
    expect(checkImportFile(file('cv.docx', 'x'))).toEqual({ ok: true, kind: 'docx' });
  });

  it('refuses an unknown type and an oversized file, with a translatable reason', () => {
    expect(checkImportFile(file('cv.exe', 'x'))).toEqual({ ok: false, reason: 'type' });
    expect(checkImportFile(null)).toEqual({ ok: false, reason: 'type' });
    const huge = { name: 'cv.txt', size: 9 * 1024 * 1024 };
    expect(checkImportFile(huge)).toEqual({ ok: false, reason: 'tooBig' });
  });
});

describe('readImportFile', () => {
  it('reads a text file as it is', async () => {
    const { text, kind } = await readImportFile(file('cv.txt', 'Ana\nFrontend\n'));
    expect(kind).toBe('text');
    expect(text).toBe('Ana\nFrontend\n');
  });

  it('reports a rejected file instead of importing nothing silently', async () => {
    await expect(readImportFile(file('cv.exe', 'x'))).rejects.toMatchObject({ reason: 'type' });
  });

  it('reads a .docx built by the app itself', async () => {
    const { blob } = await buildDocx(
      '# Ana Gomez\n\nana@mail.com\n\n## EXPERIENCIA\n\n- Led the migration that cut deploys by 45%',
      styles,
    );
    const text = await readDocxText(await blob.arrayBuffer());
    expect(text).toContain('Ana Gomez');
    expect(text).toContain('ana@mail.com');
    expect(text).toContain('Led the migration that cut deploys by 45%');
  });

  it('does not read a zip that is not a word document', async () => {
    const { blob } = await buildDocx('# Ana', styles);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(readZipEntries(bytes).some((entry) => entry.name === 'word/document.xml')).toBe(true);
    await expect(readDocxText(new Uint8Array([1, 2, 3, 4]).buffer)).rejects.toThrow();
  });
});

describe('readZipEntries', () => {
  it('returns nothing for bytes that are not a zip', () => {
    expect(readZipEntries(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]))).toEqual([]);
  });
});
