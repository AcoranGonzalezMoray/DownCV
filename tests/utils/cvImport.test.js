import { describe, it, expect } from 'vitest';
import { textToMarkdown, detectSection } from '../../src/utils/cvImport';

const SAMPLE = `Ana Gómez Ruiz
Senior Frontend Engineer
ana.gomez@mail.com | +34 600 11 22 33 | linkedin.com/in/anagomez

RESUMEN PROFESIONAL
Ingeniera frontend con 8 años construyendo interfaces accesibles y equipos de producto.

EXPERIENCIA
Acme Corp | 2020 - 2024
• Lideré la migración que redujo los despliegues un 45% y Saving $120k al año
• Rebuité el servicio de facturación con clientes legacy

Globex | 2018 - 2020
2018 - 2020
• Automaticé el pipeline de CI

FORMACIÓN
Grado en Ingeniería Informática | 2012 - 2016

HABILIDADES
React · TypeScript · CSS · Playwright

Página 2 de 2
`;

describe('detectSection', () => {
  it('knows the section titles of both languages, in any decoration', () => {
    expect(detectSection('EXPERIENCE')).toBe('experience');
    expect(detectSection('Experiencia laboral')).toBe('experience');
    expect(detectSection('  EDUCACIÓN  ')).toBe('education');
    expect(detectSection('## Skills')).toBe('skills');
    expect(detectSection('Technical Skills')).toBe('skills');
    expect(detectSection('Ana Gómez Ruiz')).toBeNull();
  });
});

describe('textToMarkdown', () => {
  it('finds the name, the contact and every section', () => {
    const result = textToMarkdown(SAMPLE, { lang: 'es' });
    expect(result.name).toBe('Ana Gómez Ruiz');
    expect(result.contact.email).toBe('ana.gomez@mail.com');
    expect(result.contact.url).toBe('linkedin.com/in/anagomez');
    expect(result.sections.map((section) => section.key)).toEqual([
      'summary',
      'experience',
      'education',
      'skills',
    ]);
  });

  it('writes Markdown the app can render, with links instead of bare text', () => {
    const { markdown } = textToMarkdown(SAMPLE, { lang: 'es' });
    expect(markdown.startsWith('# Ana Gómez Ruiz\n')).toBe(true);
    expect(markdown).toContain('[linkedin.com/in/anagomez](https://linkedin.com/in/anagomez)');
    expect(markdown).toContain('[ana.gomez@mail.com](mailto:ana.gomez@mail.com)');
    expect(markdown).toContain('## EXPERIENCIA');
    expect(markdown).toContain('### Acme Corp | 2020 - 2024');

    expect(markdown).toContain('- Lideré la migración que redujo los despliegues un 45%');
    expect(markdown).toContain('- TypeScript');
  });

  it('translates the section titles when the source has none', () => {
    const spanish = textToMarkdown(SAMPLE, { lang: 'es' }).markdown;
    const english = textToMarkdown(SAMPLE, { lang: 'en' }).markdown;
    expect(spanish).toContain('## EDUCACIÓN');
    expect(english).toContain('## EDUCATION');
  });

  it('puts the sections in the order a recruiter reads them', () => {
    const { markdown } = textToMarkdown(`# ignored

SKILLS
- React

EXPERIENCE
Acme | 2020 - 2024
- Did things

EDUCATION
BSc | 2015 - 2019
`);
    expect(markdown.indexOf('## EXPERIENCE')).toBeLessThan(markdown.indexOf('## EDUCATION'));
    expect(markdown.indexOf('## EDUCATION')).toBeLessThan(markdown.indexOf('## SKILLS'));
  });

  it('drops the noise of an exported PDF without losing a real line', () => {
    const { markdown } = textToMarkdown(SAMPLE, { lang: 'es' });
    expect(markdown).not.toContain('Página 2 de 2');
    expect(markdown).not.toMatch(/^_{3,}$/m);
    expect(markdown).toContain('Ingeniera frontend');
  });

  it('never invents a name or an email that is not in the source', () => {
    const result = textToMarkdown('Some random notes\nwithout a name');
    expect(result.warnings).toContain('noEmail');
    expect(result.markdown).toContain('Some random notes');
  });

  it('warns instead of failing on a document with no sections', () => {
    const result = textToMarkdown('Solo una frase suelta.');
    expect(result.sections).toEqual([]);
    expect(result.markdown).toContain('Solo una frase suelta.');
  });

  it('handles an empty file without throwing', () => {
    const result = textToMarkdown('');
    expect(result.markdown.trim()).toBe('');
    expect(result.warnings).toContain('noName');
  });

  it('separates the blocks with a <br>, like the sample templates', () => {
    const { markdown } = textToMarkdown(SAMPLE, { lang: 'es' });
    expect(markdown).toContain('<br>');
    expect(markdown).not.toMatch(/^---$/m);
  });

  it('reads a CV that is already Markdown without doubling the markup', () => {
    const already =
      '# Ana Gomez\n\n## EXPERIENCE\n\n### Acme | 2020 - 2024\n\n- Cut deploys by 45%';
    const { markdown, name } = textToMarkdown(already);
    expect(name).toBe('Ana Gomez');
    expect(markdown).toContain('- Cut deploys by 45%');
    expect(markdown).not.toContain('####');
  });
});
