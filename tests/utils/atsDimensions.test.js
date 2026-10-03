import { describe, it, expect } from 'vitest';
import { DIMENSION_IDS, dimensionAdvice, scoreDimensions } from '../../src/utils/atsDimensions';

const checks = [
  { id: 'text', title: 'Text layer', pass: true, points: 15, max: 15 },
  { id: 'pages', title: 'Pages', pass: true, points: 10, max: 10 },
  { id: 'length', title: 'Length', pass: true, points: 5, max: 5 },
  { id: 'residue', title: 'Residue', pass: true, points: 10, max: 10 },
  { id: 'contact', title: 'Contact', pass: true, points: 10, max: 10 },
  { id: 'sections', title: 'Sections', pass: true, points: 10, max: 10 },
  { id: 'verbs', title: 'Verbs', pass: false, points: 0, max: 15 },
  { id: 'metrics', title: 'Metrics', pass: false, points: 4, max: 10 },
  { id: 'bullets', title: 'Bullets', pass: true, points: 5, max: 5 },
  { id: 'keywords', title: 'Keywords', pass: true, points: 5, max: 5 },
  { id: 'density', title: 'Density', pass: true, points: 3, max: 3 },
  { id: 'stuffing', title: 'Stuffing', pass: true, points: 2, max: 2 },
];

describe('scoreDimensions', () => {
  it('scores each dimension against the points it really holds', () => {
    const found = scoreDimensions(checks);
    const byId = Object.fromEntries(found.map((entry) => [entry.id, entry]));


    expect(byId.structure).toMatchObject({ points: 40, max: 40, percent: 100, lost: 0 });
    expect(byId.contact).toMatchObject({ points: 20, max: 20, percent: 100 });

    expect(byId.verbs).toMatchObject({ points: 0, max: 15, percent: 0, lost: 15 });
    expect(byId.metrics).toMatchObject({ points: 9, max: 15, percent: 60, lost: 6 });
    expect(byId.keywords).toMatchObject({ points: 10, max: 10, percent: 100 });
  });

  it('always answers with the five dimensions, in order', () => {
    expect(scoreDimensions(checks).map((entry) => entry.id)).toEqual(DIMENSION_IDS);
    expect(scoreDimensions([])).toHaveLength(5);
  });

  it('names the checks that cost the points', () => {
    const found = scoreDimensions(checks);
    const byId = Object.fromEntries(found.map((entry) => [entry.id, entry]));
    expect(byId.verbs.failed).toEqual(['Verbs']);
    expect(byId.structure.failed).toEqual([]);
  });

  it('does not divide by zero when a dimension holds no points', () => {
    const [first] = scoreDimensions([{ id: 'text', pass: true, points: 15, max: 15 }]);
    expect(first.percent).toBe(100);
  });
});

describe('dimensionAdvice', () => {
  it('has something to say in both languages', () => {
    DIMENSION_IDS.forEach((id) => {
      expect(dimensionAdvice(id, 'en').length).toBeGreaterThan(10);
      expect(dimensionAdvice(id, 'es').length).toBeGreaterThan(10);
    });
  });

  it('falls back to English for a language it does not know', () => {
    expect(dimensionAdvice('verbs', 'fr')).toBe(dimensionAdvice('verbs', 'en'));
    expect(dimensionAdvice('nope', 'en')).toBe('');
  });
});
