import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import ATSAnalyzer from '../../src/components/ATSAnalyzer';
import { evaluatePdf } from '../../src/utils/atsPdfEvaluation';
import { fitToPages } from '../../src/utils/pdfBuilder';
import { hashMarkdown } from '../../src/utils/atsPdfHistory';
import { translations } from '../../src/data/translations';

vi.mock('../../src/utils/atsPdfEvaluation', () => ({ evaluatePdf: vi.fn() }));
vi.mock('../../src/utils/pdfBuilder', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fitToPages: vi.fn() };
});

const t = translations.en;

const MD = '# Ana Gomez\n\n## EXPERIENCE\n\nAcme Corp';

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

const check = (id, title, pass, points, max, extra = {}) => ({
  id,
  title,
  pass,
  points,
  max,
  msg: `${title} message`,
  examples: pass ? [] : [`${title} example`],
  ...extra,
});

const fixableChecks = () => [
  check('text', 'Text layer', true, 15, 15),
  check('pages', 'Pages', true, 10, 10),
  check('contact', 'Contact', false, 0, 10, {
    fix: { type: 'insertContact' },
  }),
  check('sections', 'Sections', false, 0, 10, {
    fix: { type: 'insertSummary', lang: 'en' },
  }),
];

const evaluation = (overrides = {}) => ({
  score: 60,
  grade: 'C',
  checks: fixableChecks(),
  text: 'Ana Gomez\nEXPERIENCE\nAcme Corp',
  pageTexts: ['Ana Gomez\nEXPERIENCE\nAcme Corp'],
  charCount: 120,
  wordCount: 20,
  pageCount: 1,
  bytes: 2048,
  createdAt: '2026-01-01T00:00:00.000Z',
  sourceHash: hashMarkdown(MD),
  artifactKey: 'key-one',
  ...overrides,
});

const renderAnalyzer = ({ markdown = MD, history: initial = [], ...extra } = {}) => {
  const setMarkdown = vi.fn();
  const setStyles = vi.fn();
  const setHistory = vi.fn();
  const onRequestLetter = vi.fn();
  const state = { history: initial };
  const holder = {};
  const node = (history) => (
    <ATSAnalyzer
      markdown={markdown}
      styles={styles}
      setStyles={setStyles}
      setMarkdown={setMarkdown}
      t={t}
      lang="en"
      history={history}
      setHistory={(updater) => {
        setHistory(updater);
        state.history = typeof updater === 'function' ? updater(state.history) : updater;
        holder.view.rerender(node(state.history));
      }}
      onRequestLetter={onRequestLetter}
      {...extra}
    />
  );
  holder.view = render(node(state.history));
  return { setMarkdown, setStyles, setHistory, onRequestLetter, state };
};

const clickEvaluate = () => {
  fireEvent.click(screen.getByRole('button', { name: t.atsPdfEvaluate }));
};

describe('ATSAnalyzer', () => {
  beforeEach(() => {
    vi.mocked(evaluatePdf).mockReset();
    vi.mocked(fitToPages).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('invites an evaluation while the history is empty', () => {
    renderAnalyzer();
    expect(screen.getByText(t.atsPdfIntro)).toBeTruthy();
    expect(screen.getByText(t.atsPdfHistoryEmpty)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.atsPdfEvaluate })).toBeTruthy();
  });

  it('scores the PDF and files the record in the history', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation());
    const { state } = renderAnalyzer();
    clickEvaluate();

    await waitFor(() => expect(state.history).toHaveLength(1));
    expect(state.history[0].score).toBe(60);
    expect(evaluatePdf).toHaveBeenCalledWith(MD, styles, expect.objectContaining({ lang: 'en' }));
    await waitFor(() =>
      expect(screen.getAllByText(`${t.gradeLabel}: C`).length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.getByRole('button', { name: t.atsPdfEvaluate }).disabled).toBe(false);
  });

  it('replaces the head instead of duplicating an identical run', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation());
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));
    clickEvaluate();
    await waitFor(() => expect(evaluatePdf).toHaveBeenCalledTimes(2));
    expect(state.history).toHaveLength(1);
  });

  it('shows the failure instead of hanging when the evaluation throws', async () => {
    vi.mocked(evaluatePdf).mockRejectedValue(new Error('pdf exploded'));
    renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(screen.getByText('pdf exploded')).toBeTruthy());
  });

  it('keeps the whole history collapsed after a new evaluation', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation());
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    const row = screen.getByRole('button', { name: /last evaluation/i });
    expect(row.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');

    clickEvaluate();
    await waitFor(() => expect(evaluatePdf).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: /last evaluation/i }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('opens a history record and compares it with the previous one', async () => {
    vi.mocked(evaluatePdf)
      .mockResolvedValueOnce(
        evaluation({ text: 'Ana Gomez\nEXPERIENCE\nAcme Corp', score: 60, artifactKey: 'k1' }),
      )
      .mockResolvedValueOnce(
        evaluation({
          text: 'Ana Gomez\nEXPERIENCE\nAcme Corp\nLeadership',
          score: 80,
          grade: 'B',
          artifactKey: 'k2',
          createdAt: '2026-01-02T00:00:00.000Z',
        }),
      );
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: /last evaluation/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t.atsPdfCompare })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: t.atsPdfCompare }));
    expect(screen.getByText(new RegExp(t.atsPdfDiffAdded))).toBeTruthy();
  });

  it('applies the fix of a single failed check and scores again', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation());
    const { setMarkdown, state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add contact block' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add contact block' }));
    await waitFor(() => expect(setMarkdown).toHaveBeenCalledTimes(1));
    const fixed = setMarkdown.mock.calls[0][0];
    expect(fixed).toContain('email@example.com');
    await waitFor(() => expect(evaluatePdf).toHaveBeenCalledTimes(2));
    expect(evaluatePdf).toHaveBeenLastCalledWith(fixed, styles, expect.anything());
  });

  it('applies every safe fix at once with a single re-score', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation());
    const { setMarkdown, state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    const fixAll = await waitFor(() => screen.getByRole('button', { name: /\(2\)/ }));
    expect(fixAll.textContent).toContain('(2)');
    fireEvent.click(fixAll);
    await waitFor(() => expect(setMarkdown).toHaveBeenCalled());
    const fixed = setMarkdown.mock.calls.at(-1)[0];
    expect(fixed).toContain('email@example.com');
    expect(fixed).toContain('PROFESSIONAL SUMMARY');
    await waitFor(() => expect(evaluatePdf).toHaveBeenCalledTimes(2));
  });

  it('fits a long document to one page and can revert the fit', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation({ pageCount: 2 }));
    vi.mocked(fitToPages).mockReturnValue({
      changed: true,
      styles: { ...styles, fontSize: 11 },
    });
    const { setStyles, state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: new RegExp(t.atsPdfFitOnePage) }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.atsPdfFitOnePage) }));
    await waitFor(() => expect(setStyles).toHaveBeenCalled());
    const applied = setStyles.mock.calls[0][0](styles);
    expect(applied.fontSize).toBe(11);
    await waitFor(() => expect(evaluatePdf).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t.atsPdfRevertFit })).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: t.atsPdfRevertFit }));
    const reverted = setStyles.mock.calls.at(-1)[0]({ ...styles, fontSize: 11 });
    expect(reverted.fontSize).toBe(13);
    expect(screen.queryByRole('button', { name: t.atsPdfRevertFit })).toBe(null);
  });

  it('admits when even the smallest layout does not fit', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation({ pageCount: 4 }));
    vi.mocked(fitToPages).mockReturnValue({ changed: false, styles });
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.atsPdfFitOnePage) }));
    await waitFor(() => expect(screen.getByText(t.atsPdfFitImpossible)).toBeTruthy());
  });

  it('downloads a report file instead of doing nothing', async () => {
    const record = evaluation({
      score: 78,
      maxScore: 100,
      gaps: [{ id: 'dates', title: 'Dates', lost: 4, msg: 'overlap', fix: null }],
    });
    global.URL.createObjectURL = vi.fn(() => 'blob:report');
    global.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderAnalyzer({ history: [{ ...record, id: 'report-record' }] });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.atsReportLabel) }));

    await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
    expect(click).toHaveBeenCalled();
  });

  it('sorts what is missing by impact and offers the report', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(
      evaluation({
        score: 70,
        grade: 'C',
        pageCount: 3,
        maxScore: 100,
        gaps: [
          { id: 'pages', title: 'Page count', lost: 8, msg: 'Three pages', fix: { type: 'fit' } },
          { id: 'contact', title: 'Contact', lost: 9, msg: 'Missing email', fix: null },
        ],
      }),
    );
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    expect(screen.getByText(translations.en.atsGapsTitle)).toBeTruthy();
    const list = screen.getByRole('list', { name: translations.en.atsGapsTitle });
    const impacts = within(list)
      .getAllByRole('listitem')
      .map((item) => Number(item.textContent.match(/-(\d+)/)[1]));
    expect(impacts).toEqual([...impacts].sort((a, b) => b - a));
    expect(screen.getByRole('button', { name: new RegExp(translations.en.atsReportLabel) })).toBeTruthy();
  });

  it('keeps tightening until the reader also lands on one page', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation({ pageCount: 4 }));
    vi.mocked(fitToPages).mockImplementation((markdownArg, stylesArg, options) => ({
      changed: true,
      reached: true,
      pages: 1,
      originalPages: 4,
      styles: { ...stylesArg, fontSize: 10, marginY: options.maxScale ? 16 : 24 },
    }));
    const { state } = renderAnalyzer({ previewPageCount: 3 });
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.atsPdfFitOnePage) }));
    await waitFor(() => expect(vi.mocked(fitToPages).mock.calls.length).toBeGreaterThan(1));
    await waitFor(() => expect(fitToPages).toHaveBeenCalledTimes(4));

    const scales = vi
      .mocked(fitToPages)
      .mock.calls.map(([, , options]) => options.maxScale);
    expect(scales[0]).toBe(1);
    scales.slice(1).forEach((scale) => expect(scale).toBeLessThan(1));
  });

  it('does not claim it does not fit when the PDF already reached one page', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation({ pageCount: 4 }));
    vi.mocked(fitToPages).mockImplementation((markdownArg, stylesArg, options) =>
      options.maxScale < 1
        ? { changed: false, reached: true, pages: 1, originalPages: 1, styles: stylesArg }
        : {
            changed: true,
            reached: true,
            pages: 1,
            originalPages: 4,
            styles: { ...stylesArg, fontSize: 11 },
          },
    );
    const { state } = renderAnalyzer({ previewPageCount: 3 });
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.atsPdfFitOnePage) }));
    await waitFor(() => expect(fitToPages.mock.calls.length).toBeGreaterThan(2));

    expect(screen.queryByText(t.atsPdfFitImpossible)).toBe(null);
  });

  it('reports how far the layout got when one page stays out of reach', async () => {
    vi.mocked(evaluatePdf).mockResolvedValue(evaluation({ pageCount: 4 }));
    vi.mocked(fitToPages).mockReturnValue({
      changed: true,
      reached: false,
      pages: 2,
      originalPages: 4,
      styles: { ...styles, fontSize: 9 },
    });
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.atsPdfFitOnePage) }));
    await waitFor(() =>
      expect(
        screen.getByText(t.atsPdfFitPartial.replace('{n}', '4').replace('{m}', '2')),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(t.atsPdfFitImpossible)).toBe(null);
  });


  it('matches a job posting, honours the seniority and offers the letter', () => {
    const cv = '# Ana Gomez\n\nSenior Engineer with Kubernetes migration experience';
    const desc = 'Senior Engineer with Kubernetes and migration experience';
    const { onRequestLetter } = renderAnalyzer({ markdown: cv, jobBrief: desc });

    fireEvent.click(screen.getByRole('button', { name: t.atsSubJob }));
    expect(screen.getByRole('button', { name: t.jobMatcherRun }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: t.levelExecutive }));
    fireEvent.click(screen.getByRole('button', { name: t.jobMatcherRun }));

    expect(screen.getByText(t.jobMatcherRate)).toBeTruthy();
    expect(screen.getByText(new RegExp(t.jobMatcherFound))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.jobMatcherWriteLetter }));
    expect(onRequestLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        jobDescription: expect.stringContaining('Kubernetes'),
        jobMatch: expect.objectContaining({ score: expect.any(Number) }),
      }),
    );
  });

  it('marks a record as stale once the CV moves on', () => {
    renderAnalyzer({
      markdown: `${MD}\n\nNew line`,
      history: [{ ...evaluation(), id: '2026-01-01T00:00:00.000Z-stale' }],
    });
    fireEvent.click(screen.getByRole('button', { name: /last evaluation/i }));
    expect(screen.getByText(t.atsPdfStale)).toBeTruthy();
  });

  it('draws the trend once there are two points', async () => {
    vi.mocked(evaluatePdf)
      .mockResolvedValueOnce(evaluation({ score: 60, artifactKey: 'k1' }))
      .mockResolvedValueOnce(
        evaluation({
          score: 80,
          artifactKey: 'k2',
          createdAt: '2026-01-02T00:00:00.000Z',
        }),
      );
    const { state } = renderAnalyzer();
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(1));
    clickEvaluate();
    await waitFor(() => expect(state.history).toHaveLength(2));
    await waitFor(() => expect(screen.getByText(t.atsPdfTrend)).toBeTruthy());
    expect(document.querySelector('polyline')).toBeTruthy();
  });
});
