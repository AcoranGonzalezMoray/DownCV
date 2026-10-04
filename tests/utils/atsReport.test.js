import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateAtsReport, downloadAtsReport } from '../../src/utils/atsReport';
import { translations } from '../../src/data/translations';

const t = translations.en;

const record = {
  score: 78,
  maxScore: 100,
  grade: 'C',
  pageCount: 2,
  wordCount: 420,
  charCount: 2600,
  createdAt: '2026-05-04T10:00:00.000Z',
  checks: [
    { id: 'text', title: 'Text layer', pass: true, points: 10, max: 10, msg: 'Readable', examples: [] },
    {
      id: 'dates',
      title: 'Dates and chronology',
      pass: false,
      points: 0,
      max: 4,
      msg: 'Two jobs claim the same months',
      examples: ['Overlap: Mar 2019 - Dic 2021 / Ene 2020 - Actualidad'],
    },
  ],
  gaps: [
    { id: 'dates', title: 'Dates and chronology', lost: 4, msg: 'Two jobs claim the same months', fix: null },
    { id: 'phrasing', title: 'Weak phrasing', lost: 5, msg: 'Fillers', fix: null },
  ],
};

const dimensions = [{ id: 'structure', percent: 100 }];

describe('atsReport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the score, the gaps and every check', () => {
    const html = generateAtsReport(record, { dimensions, t, title: 'ATS report' });

    expect(html).toContain('ATS report');
    expect(html).toContain('78');
    expect(html).toContain('/100');
    expect(html).toContain('-4');
    expect(html).toContain('Dates and chronology');
    expect(html).toContain('Two jobs claim the same months');
    expect(html).toContain('10/10');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('says there is nothing missing when every check passes', () => {
    const perfect = { ...record, score: 100, grade: 'A', gaps: [] };
    const html = generateAtsReport(perfect, { t });

    expect(html).not.toContain('text-amber-400">-');
    expect(html).not.toContain(t.atsReportGaps);
  });

  it('ships pure ASCII so the accents cannot be read back as mojibake', () => {
    const spanish = { ...record, grade: 'C' };
    const html = generateAtsReport(spanish, { t: translations.es, title: 'Informe ATS' });

    expect(html).toMatch(/^[\x00-\x7f]*$/);
    expect(html).toContain('Informe');
  });

  it('escapes the content instead of trusting it', () => {
    const hostile = {
      ...record,
      gaps: [{ id: 'x', title: '<script>alert(1)</script>', lost: 1, msg: 'x' }],
    };
    const html = generateAtsReport(hostile, { t });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('downloads the report as a file named after the CV', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:report');
    global.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const name = downloadAtsReport(record, { t, sourceMarkdown: '# Ana Gomez' });

    expect(name).toMatch(/^CV_Ana_Gomez_.*-ats\.html$/);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
