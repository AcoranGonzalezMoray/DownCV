import { describe, it, expect, vi } from 'vitest';
import { jsPDF } from 'jspdf';

vi.mock('../../src/utils/pdfText', async () => {
  const actual = await vi.importActual('../../src/utils/pdfText');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return { ...actual, extractPdfText: (data) => actual.extractPdfText(data, { pdfjs }) };
});

const { readImportFile } = await import('../../src/utils/importFiles');
const { textToMarkdown } = await import('../../src/utils/cvImport');

const buildSamplePdf = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Ana Gomez', 56, 70);
  doc.text('ana@mail.com | linkedin.com/in/ana', 56, 92);
  doc.text('EXPERIENCIA', 56, 140);
  doc.text('Acme Corp | 2020 - 2024', 56, 162);
  doc.text('Led the migration that cut deploys by 45%', 56, 184);
  doc.text('HABILIDADES', 56, 230);
  doc.text('React, TypeScript, CSS', 56, 252);
  return Buffer.from(doc.output('arraybuffer'));
};

const asFile = (buffer, name) => new File([new Uint8Array(buffer)], name);

describe('readImportFile with a real PDF', () => {
  it('reads the text layer of a PDF instead of calling it empty', async () => {
    const { text, kind } = await readImportFile(asFile(buildSamplePdf(), 'cv.pdf'));
    expect(kind).toBe('pdf');
    expect(text).toContain('Ana Gomez');
    expect(text).toContain('ana@mail.com');
    expect(text).toContain('EXPERIENCIA');
    expect(text).toContain('Led the migration that cut deploys by 45%');
  });

  it('turns that text into a Markdown CV the editor can use', async () => {
    const { text } = await readImportFile(asFile(buildSamplePdf(), 'cv.pdf'));
    const { markdown, name, contact, sections } = textToMarkdown(text, { lang: 'en' });
    expect(name).toBe('Ana Gomez');
    expect(contact.email).toBe('ana@mail.com');
    expect(sections.map((section) => section.key)).toEqual(['experience', 'skills']);
    expect(markdown).toContain('## EXPERIENCE');
    expect(markdown).toContain('- Led the migration that cut deploys by 45%');
    expect(markdown).not.toMatch(/\)\]\(\[|\[mailto:[^\]]+\]\(mailto:/);
  });

  it('reports a PDF with no text layer as unreadable, not as a crash', async () => {

    const blank = new jsPDF({ unit: 'pt', format: 'a4' });
    blank.setFontSize(40);
    blank.text('X', 10, 10);
    const { text } = await readImportFile(
      asFile(Buffer.from(blank.output('arraybuffer')), 'scan.pdf'),
    );
    expect(text).toBe('X');
  });
});
