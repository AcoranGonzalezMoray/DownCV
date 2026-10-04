import { describe, it, expect } from 'vitest';
import { fitToPages, renderPdfDocument, scaleLayout } from '../../src/utils/pdfBuilder';

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

const bullet = (count) =>
  Array.from(
    { length: count },
    (_, index) =>
      `- Led the migration of the billing platform to Kubernetes, cutting deploy time by 45% and incidents by 30% across 12 squads (round ${index + 1})`,
  ).join('\n');

const cv = (entries, perEntry = 6) => `# Ana Gomez
ana@mail.com | +34 600 000 000 | linkedin.com/in/anagomez

## EXPERIENCE

${Array.from({ length: entries }, (_, index) => `### Company ${index + 1}\n${bullet(perEntry)}`).join('\n\n')}

## EDUCATION

### BSc Computer Science
`;

describe('scaleLayout', () => {
  it('never goes below the readability floors, however hard it is pushed', () => {
    const squeezed = scaleLayout(styles, 0);
    expect(squeezed.fontSize).toBeGreaterThanOrEqual(9);
    expect(squeezed.lineHeight).toBeGreaterThanOrEqual(1.15);
    expect(squeezed.sectionGap).toBeGreaterThanOrEqual(5);
    expect(squeezed.itemGap).toBeGreaterThanOrEqual(3);
    expect(squeezed.marginX).toBeGreaterThanOrEqual(14);
    expect(squeezed.marginY).toBeGreaterThanOrEqual(12);
  });

  it('leaves the layout untouched at the top of the scale', () => {
    expect(scaleLayout(styles, 1)).toEqual(styles);
  });
});

describe('fitToPages', () => {
  it('keeps the layout as it is when the CV already fits', () => {
    const markdown = cv(2);
    const result = fitToPages(markdown, styles, { targetPages: 1 });

    expect(renderPdfDocument(markdown, styles).pages).toBe(1);
    expect(result.changed).toBe(false);
    expect(result.reached).toBe(true);
    expect(result.styles).toBe(styles);
  });

  it('nudges the layout just enough to reach one page instead of crushing it', () => {
    const markdown = cv(6);
    const result = fitToPages(markdown, styles, { targetPages: 1 });

    expect(result.changed).toBe(true);
    expect(result.reached).toBe(true);
    expect(result.originalPages).toBe(2);
    expect(result.pages).toBe(1);
    expect(renderPdfDocument(markdown, result.styles).pages).toBe(1);
    expect(result.styles.fontSize).toBeGreaterThan(12);
    expect(result.styles.lineHeight).toBeGreaterThan(1.4);
    expect(result.styles.marginX).toBeGreaterThan(20);
  });

  it('cuts as many pages as it can when one page is out of reach', () => {
    const markdown = cv(18);
    const result = fitToPages(markdown, styles, { targetPages: 1 });

    expect(result.originalPages).toBeGreaterThan(2);
    expect(result.changed).toBe(true);
    expect(result.reached).toBe(false);
    expect(result.pages).toBeLessThan(result.originalPages);
    expect(renderPdfDocument(markdown, result.styles).pages).toBe(result.pages);
  });
});
