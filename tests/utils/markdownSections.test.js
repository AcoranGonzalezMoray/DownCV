import { describe, it, expect } from 'vitest';
import { listSections, moveSection, documentHeader, sectionIndexAt } from '../../src/utils/markdownSections';

const CV = `# Ana Gomez

ana@mail.com | +34 600 000 000

## EXPERIENCE

### Acme Corp | 2020 - 2024

- Cut deploys by 45%

## EDUCATION

### BSc | 2015 - 2019

## SKILLS

- React
`;

describe('markdownSections', () => {
  it('lists the sections with the range of the source each one owns', () => {
    const sections = listSections(CV);
    expect(sections.map((section) => section.title)).toEqual(['EXPERIENCE', 'EDUCATION', 'SKILLS']);
    expect(CV.slice(sections[0].start, sections[0].end)).toContain('Cut deploys by 45%');
    expect(CV.slice(sections[0].end, sections[1].end)).toContain('BSc');
    expect(sections.at(-1).end).toBe(CV.length);
  });

  it('never moves the header, which has to stay on top', () => {
    const moved = moveSection(CV, 2, 0);
    expect(moved.startsWith('# Ana Gomez\n\nana@mail.com | +34 600 000 000\n\n')).toBe(true);
    expect(moved.indexOf('## SKILLS')).toBeLessThan(moved.indexOf('## EXPERIENCE'));
    expect(documentHeader(moved)).toBe(documentHeader(CV));
  });

  it('moves a section down and keeps every block of it', () => {
    const moved = moveSection(CV, 0, 2);
    expect(moved.indexOf('## EDUCATION')).toBeLessThan(moved.indexOf('## SKILLS'));
    expect(moved.indexOf('## SKILLS')).toBeLessThan(moved.indexOf('## EXPERIENCE'));
    expect(moved).toContain('### Acme Corp | 2020 - 2024');
    expect(moved).toContain('- Cut deploys by 45%');
  });

  it('keeps the order of the other sections', () => {
    const moved = moveSection(CV, 0, 1);
    expect(moved.indexOf('## EDUCATION')).toBeLessThan(moved.indexOf('## EXPERIENCE'));
    expect(moved.indexOf('## SKILLS')).toBeGreaterThan(moved.indexOf('## EXPERIENCE'));
  });

  it('refuses a move that changes nothing', () => {
    expect(moveSection(CV, 1, 1)).toBeNull();
    expect(moveSection(CV, 0, 9)).toBeNull();
  });

  it('survives content without sections', () => {
    expect(listSections('')).toEqual([]);
    expect(listSections('Just a paragraph')).toEqual([]);
    expect(documentHeader('Just a paragraph')).toBe('Just a paragraph');
    expect(moveSection('Just a paragraph', 0, 1)).toBeNull();
  });

  it('maps a source offset to the section that holds it', () => {
    const sections = listSections(CV);
    expect(sectionIndexAt(sections, sections[0].start)).toBe(0);
    expect(sectionIndexAt(sections, CV.indexOf('- React'))).toBe(2);
    expect(sectionIndexAt(sections, 0)).toBe(-1);
  });

  it('does not lose a single character while reordering', () => {
    const moved = moveSection(CV, 2, 0);
    const letters = (text) => text.replace(/\s/g, '').split('').sort().join('');
    expect(letters(moved)).toBe(letters(CV));
  });
});
