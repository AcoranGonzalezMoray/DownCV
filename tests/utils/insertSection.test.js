import { describe, it, expect } from 'vitest';
import { insertSection } from '../../src/utils/insertSection';
import { snippet, snippets, snippetIds } from '../../src/data/snippets';

const CV = `# Ana Gomez

ana@mail.com | +34 600 000 000

## WORK EXPERIENCE

### **Acme** | Madrid
**Engineer** | *2020 – Present*
- Kept the billing service under a minute.

## EDUCATION

### **UPM**
**BSc** | *2014 – 2018*
`;

const skills = snippet('skills', 'en');
const education = snippet('education', 'es');

describe('insertSection', () => {
  it('adds a whole section, heading included, at the end of the document', () => {
    const result = insertSection(CV, skills);
    expect(result.markdown).toBe(
      `${CV}\n## TECHNICAL SKILLS\n\n- **Languages:** JavaScript, TypeScript, Python, SQL.\n- **Frameworks & Tools:** React, Node.js, Git, Docker, AWS.\n\n<br>\n`,
    );

    expect(result.markdown.slice(0, result.caret)).toBe(result.markdown.replace(/\n$/, ''));
  });

  it('leaves the line break the templates separate their sections with', () => {
    const result = insertSection(CV, skills);
    expect(result.markdown).toContain('Docker, AWS.\n\n<br>');

    expect(insertSection(CV, snippet('experience', 'en')).markdown).toContain(
      '**[X] hours**.\n\n<br>\n\n## EDUCATION',
    );
  });

  it('never leaves two blank lines behind', () => {
    const padded = `${CV}\n\n\n`;
    const result = insertSection(padded, skills);
    expect(result.markdown).not.toMatch(/\n{3}/);
  });

  it('extends the section that is already there instead of repeating the heading', () => {
    const result = insertSection(CV, snippet('experience', 'en'));
    expect(result.markdown.match(/## WORK EXPERIENCE/g)).toHaveLength(1);

    expect(result.markdown).toContain('cutting turnaround time by **[X] hours**.');
    expect(result.markdown).toContain('- Kept the billing service under a minute.');
  });

  it('recognises a section written with other wording', () => {
    const cv = '# Ana\n\n## Experiencia Laboral\n- algo\n\n## Educación\n- algo\n';
    const result = insertSection(cv, education);
    expect(result.markdown.match(/## Educación/g)).toHaveLength(1);
    expect(result.markdown).toContain('**Titulación académica**');
  });

  it('matches a heading regardless of case and accents', () => {
    const cv = '# Ana\n\n## HABILIDADES TÉCNICAS\n- Una\n';
    const result = insertSection(cv, snippet('skills', 'es'));
    expect(result.markdown.match(/## HABILIDADES TÉCNICAS/g)).toHaveLength(1);
    expect(result.markdown).toContain('**Lenguajes:**');
  });

  it('writes the section where the caret is when the caret is on a boundary', () => {

    const at = CV.indexOf('## EDUCATION');
    const result = insertSection(CV, skills, at);
    expect(result.markdown.indexOf('## TECHNICAL SKILLS')).toBeLessThan(
      result.markdown.indexOf('## EDUCATION'),
    );
    expect(result.markdown).toContain('under a minute.\n\n## TECHNICAL SKILLS\n\n- **Languages:**');
  });

  it('moves the block to the end of the section being written when the caret is mid line', () => {

    const at = CV.indexOf('Kept the billing service');
    const result = insertSection(CV, skills, at);
    expect(result.markdown).toContain('- Kept the billing service under a minute.');
    expect(result.markdown).toContain('under a minute.\n\n## TECHNICAL SKILLS');
  });

  it('keeps every section intact, in the same order', () => {
    const result = insertSection(CV, skills, CV.indexOf('Kept the billing service'));
    const titles = result.markdown.match(/^## .+$/gm);
    expect(titles).toEqual(['## WORK EXPERIENCE', '## TECHNICAL SKILLS', '## EDUCATION']);
  });

  it('returns null when there is nothing to insert', () => {
    expect(insertSection(CV, null)).toBe(null);
    expect(insertSection(CV, { heading: 'X' })).toBe(null);
  });

  it('works on an empty document', () => {
    const result = insertSection('', skills, 0);
    expect(result.markdown).toBe(
      '## TECHNICAL SKILLS\n\n- **Languages:** JavaScript, TypeScript, Python, SQL.\n- **Frameworks & Tools:** React, Node.js, Git, Docker, AWS.\n\n<br>\n',
    );
  });
});

describe('snippets', () => {
  it('has a block for each button, in both languages', () => {
    expect(snippetIds).toEqual(['experience', 'education', 'skills', 'certification']);
    for (const id of snippetIds) {
      for (const lang of ['en', 'es']) {
        const block = snippet(id, lang);
        expect(block.heading).toBeTruthy();
        expect(block.body).toBeTruthy();
      }
    }
  });

  it('writes the section in the language of the interface', () => {
    expect(snippet('experience', 'es').heading).toBe('EXPERIENCIA LABORAL');
    expect(snippet('experience', 'es').body).toContain('Nombre de la empresa');
    expect(snippet('education', 'es').heading).toBe('EDUCACIÓN');
    expect(snippet('certification', 'en').heading).toBe('CERTIFICATIONS');
    expect(snippet('certification', 'es').body).toContain('Entidad emisora');
  });

  it('falls back to English for a language it does not know', () => {
    expect(snippet('skills', 'de').heading).toBe(snippets.skills.heading.en);
  });

  it('keeps the placeholders of the block, so nothing is invented', () => {
    for (const lang of ['en', 'es']) {
      expect(snippet('experience', lang).body).toMatch(/\[[^\]]+\]/);
    }
  });
});
