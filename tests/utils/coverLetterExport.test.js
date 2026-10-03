import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  buildCoverLetterPdf,
  downloadCoverLetterPdf,
  letterPrintDocument,
  printCoverLetter,
} from '../../src/utils/coverLetterExport';

const styles = {
  fontFamily: 'Inter, sans-serif',
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

const letter = '# Ana Gomez\n\nDear Globex team,\n\nLed the migration that cut deploys by 45%.\n';

describe('coverLetterExport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a real PDF from the letter', () => {
    const { blob } = buildCoverLetterPdf(letter, styles);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(500);
  });

  it('downloads that PDF through a blob link', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:cover-letter');
    global.URL.revokeObjectURL = vi.fn();

    const blob = downloadCoverLetterPdf(letter, styles, 'Ana_Cover_Letter.pdf');

    expect(blob.type).toBe('application/pdf');
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('renders the printable document with the letter title', () => {
    const html = letterPrintDocument(letter, styles);
    expect(html).toContain('Ana Gomez');
    expect(html).toContain('Dear Globex team');
    expect(html).toContain('<title>Ana Gomez</title>');
  });

  it('opens the print dialog of the letter in its own window', () => {
    const win = {
      document: { write: vi.fn(), close: vi.fn() },
      addEventListener: vi.fn(),
      focus: vi.fn(),
      print: vi.fn(),
    };
    vi.stubGlobal('open', vi.fn(() => win));

    expect(printCoverLetter(letter, styles)).toBe(true);
    expect(win.document.write).toHaveBeenCalledWith(
      expect.stringContaining('Dear Globex team'),
    );
    expect(win.document.close).toHaveBeenCalled();
    expect(win.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('reports a blocked popup instead of throwing', () => {
    vi.stubGlobal('open', vi.fn(() => null));
    expect(printCoverLetter(letter, styles)).toBe(false);
  });
});
