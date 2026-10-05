import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ScoreBreakdown from '../../src/components/ScoreBreakdown';
import { translations } from '../../src/data/translations';

const t = translations.en;

const checks = [
  { id: 'text', title: 'Text layer', pass: true, points: 15, max: 15 },
  { id: 'pages', title: 'Pages', pass: true, points: 10, max: 10 },
  { id: 'length', title: 'Length', pass: true, points: 5, max: 5 },
  { id: 'residue', title: 'Residue', pass: true, points: 10, max: 10 },
  { id: 'contact', title: 'Contact', pass: true, points: 10, max: 10 },
  { id: 'sections', title: 'Sections', pass: true, points: 10, max: 10 },
  { id: 'verbs', title: 'Action verbs', pass: false, points: 0, max: 15 },
  { id: 'metrics', title: 'Metrics', pass: false, points: 4, max: 10 },
  { id: 'bullets', title: 'Bullets', pass: true, points: 5, max: 5 },
  { id: 'keywords', title: 'Keywords', pass: true, points: 5, max: 5 },
  { id: 'density', title: 'Density', pass: true, points: 3, max: 3 },
  { id: 'stuffing', title: 'Stuffing', pass: true, points: 2, max: 2 },
];

describe('ScoreBreakdown', () => {
  afterEach(() => cleanup());

  it('draws nothing at all without an evaluation to take apart', () => {
    const { container } = render(<ScoreBreakdown checks={[]} t={t} />);
    
    expect(container.textContent).toBe('');
  });

  it('names the five dimensions and scores each against its own points', () => {
    render(<ScoreBreakdown checks={checks} t={t} lang="en" />);
    const row = (name) => screen.getByText(name).closest('li').textContent;

    expect(row('Structure and format')).toMatch(/100%/);
    expect(row('Action verbs')).toMatch(/0%.*0\/15/);

    expect(row('Numbers and results')).toMatch(/60%.*9\/15/);
  });

  it('says what to do about the dimensions that are not full', () => {
    render(<ScoreBreakdown checks={checks} t={t} lang="en" />);

    expect(screen.getAllByText(/Start the achievements with a verb/)).toHaveLength(1);
    expect(screen.getByText(/Add the number behind each achievement/)).toBeTruthy();
    expect(screen.queryByText(/Make the document fit the page/)).toBe(null);
  });

  it('points at the dimension worth the most points lost', () => {
    render(<ScoreBreakdown checks={checks} t={t} lang="en" />);

    expect(screen.getByText(/The weakest part is Action verbs/)).toBeTruthy();
  });

  it('writes the advice in the language of the interface', () => {
    render(<ScoreBreakdown checks={checks} t={translations.es} lang="es" />);
    expect(screen.getByText(/Empieza los logros con un verbo/)).toBeTruthy();
    expect(screen.getByText(/La parte más débil es Verbos de acción/)).toBeTruthy();
  });

  it('draws a radar of the same five numbers the bars show', () => {
    render(<ScoreBreakdown checks={checks} t={t} lang="en" />);
    const radar = screen.getByRole('img', { name: /Where the points are/ });

    expect(radar.querySelectorAll('polygon')).toHaveLength(5);
    expect(radar.querySelectorAll('line')).toHaveLength(5);
    expect(radar.querySelectorAll('circle')).toHaveLength(5);
  });

  it('says nothing is weakest when the CV is full marks everywhere', () => {
    const perfect = checks.map((check) => ({ ...check, pass: true, points: check.max }));
    render(<ScoreBreakdown checks={perfect} t={t} lang="en" />);
    expect(screen.queryByText(/The weakest part is/)).toBe(null);
  });
});
