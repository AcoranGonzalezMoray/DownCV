import { describe, it, expect } from 'vitest';
import { sampleCVs, samplesFor, defaultSample } from '../../src/data/sampleCVs';
import { listSections } from '../../src/utils/markdownSections';

describe('sampleCVs', () => {
  it('has every template in both languages', () => {
    for (const lang of ['en', 'es']) {
      expect(samplesFor(lang).length).toBeGreaterThanOrEqual(3);
    }

    expect(sampleCVs).toHaveLength(8);
    expect(sampleCVs.filter((sample) => sample.lang === 'en')).toHaveLength(4);
    expect(sampleCVs.filter((sample) => sample.lang === 'es')).toHaveLength(4);
  });

  it('only offers the templates written in the language of the interface', () => {
    for (const sample of samplesFor('es')) {
      expect(sample.lang).toBe('es');
    }
    for (const sample of samplesFor('en')) {
      expect(sample.lang).toBe('en');
    }
    expect(samplesFor('es')).not.toEqual(samplesFor('en'));
  });

  it('writes each sample in its own language, headings included', () => {
    const es = samplesFor('es');
    const en = samplesFor('en');
    for (const sample of es) {
      expect(sample.markdown).toMatch(
        /## (RESUMEN PROFESIONAL|EXPERIENCIA LABORAL|EDUCACIÓN|HABILIDADES)/,
      );
      expect(sample.markdown).not.toMatch(/^## (WORK EXPERIENCE|EDUCATION|SKILLS)/m);
    }
    for (const sample of en) {
      expect(sample.markdown).toMatch(
        /## (PROFESSIONAL SUMMARY|EXECUTIVE SUMMARY|WORK EXPERIENCE|EDUCATION|SKILLS|CORE SKILLS)/,
      );
      expect(sample.markdown).not.toMatch(/^## (EXPERIENCIA|EDUCACIÓN|HABILIDADES)/m);
    }
  });

  it('has the sections an ATS expects, in the language they are written in', () => {
    for (const sample of sampleCVs) {
      const titles = listSections(sample.markdown).map((section) => section.title.toUpperCase());
      const text = titles.join(' ');
      const experience = sample.lang === 'es' ? /EXPERIENCIA/ : /EXPERIENCE/;
      const education = sample.lang === 'es' ? /EDUCACI/ : /EDUCATION/;
      const skills = sample.lang === 'es' ? /HABILIDADES/ : /SKILLS/;
      expect(titles.length, `${sample.id} has no sections`).toBeGreaterThanOrEqual(4);
      expect(text).toMatch(experience);
      expect(text).toMatch(education);
      expect(text).toMatch(skills);
    }
  });

  it('keeps a contact line, a link and a number in every sample', () => {
    for (const sample of sampleCVs) {
      expect(sample.markdown).toMatch(/^# .+$/m);
      expect(sample.markdown).toMatch(/\]\(mailto:/);
      expect(sample.markdown).toMatch(/linkedin\.com/);
      expect(sample.markdown).toMatch(/\d/);
      expect(sample.name).not.toMatch(/\((Español|English)\)/);
    }
  });

  it('opens on a template in the chosen language, and never invents a language', () => {
    expect(defaultSample('es').lang).toBe('es');
    expect(defaultSample('en').lang).toBe('en');
    expect(defaultSample('de').lang).toBe('en');
  });

  it('gives every sample a unique id, so a draft can point at it', () => {
    expect(new Set(sampleCVs.map((sample) => sample.id)).size).toBe(sampleCVs.length);
  });
});
