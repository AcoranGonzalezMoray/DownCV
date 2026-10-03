import { describe, it, expect } from 'vitest';
import {
  buildCoverLetter,
  coverLetterToPlainText,
  readCvProfile,
  readJobBrief,
  pickAchievements,
} from '../../src/utils/coverLetter';
import { letterPrintDocument } from '../../src/utils/coverLetterExport';

const CV = `# Ana Gomez

ana@mail.com | +34 600 000 000 | linkedin.com/in/ana

## RESUMEN PROFESIONAL

Frontend engineer with 8 years of experience building accessible products.

## EXPERIENCIA

### Acme Corp | 2020 - 2024

- Led the migration that cut deploys by 45% and saved $120k a year
- Rebuilt the billing service for legacy clients, dropping incidents by 30%

## EDUCACIÓN

### BSc Computer Science | 2015 - 2019
`;

describe('readCvProfile', () => {
  it('reads the name, the contact line and the achievements of the CV', () => {
    const profile = readCvProfile(CV);
    expect(profile.name).toBe('Ana Gomez');
    expect(profile.contactLine).toContain('ana@mail.com');
    expect(profile.bullets.map((bullet) => bullet.text)).toEqual([
      'Led the migration that cut deploys by 45% and saved $120k a year',
      'Rebuilt the billing service for legacy clients, dropping incidents by 30%',
    ]);
  });

  it('does not throw on content that is not a CV', () => {
    expect(readCvProfile('').name).toBe('');
    expect(readCvProfile(null).bullets).toEqual([]);
  });
});

describe('pickAchievements', () => {
  it('prefers the bullets that carry a verb and a number', () => {
    const profile = readCvProfile(CV);
    const picked = pickAchievements(profile, 2);
    expect(picked).toHaveLength(2);
    expect(picked[0]).toContain('45%');
  });

  it('leaves out the placeholders, which say nothing about the candidate', () => {
    const profile = readCvProfile(
      '# Ana\n\n## EXPERIENCIA\n\n- [Two or three lines with a number]',
    );
    expect(pickAchievements(profile, 2)).toEqual([]);
  });
});

describe('buildCoverLetter', () => {
  it('writes a letter in the language of the interface, with the data of the CV', () => {
    const { markdown, missing, name } = buildCoverLetter(CV, {
      lang: 'en',
      role: 'Frontend Engineer',
      company: 'Globex',
    });
    expect(name).toBe('Ana Gomez');
    expect(missing).toEqual([]);
    expect(markdown).toContain('# Ana Gomez');
    expect(markdown).toContain('ana@mail.com');
    expect(markdown).toContain('**Application: Frontend Engineer at Globex**');
    expect(markdown).toContain('Dear Globex team,');
    expect(markdown).toContain(
      'I am writing to apply for the Frontend Engineer position at Globex.',
    );

    expect(markdown).toContain('Led the migration that cut deploys by 45%');
    expect(markdown).toContain('With 8 years of experience');
    expect(markdown).toContain('Kind regards,');
  });

  it('writes the same letter in Spanish when the interface is in Spanish', () => {
    const { markdown } = buildCoverLetter(CV, {
      lang: 'es',
      role: 'Frontend Engineer',
      company: 'Globex',
    });
    expect(markdown).toContain('Estimado equipo de Globex,');
    expect(markdown).toContain('Escribo para solicitar la vacante de Frontend Engineer en Globex');
    expect(markdown).toContain('Un cordial saludo,');
    expect(markdown).not.toContain('Dear');
  });

  it('says what is still missing instead of inventing it', () => {
    const { markdown, missing } = buildCoverLetter(CV, { lang: 'en' });
    expect(missing).toEqual(expect.arrayContaining(['role', 'company']));
    expect(markdown).toContain('[the role]');
    expect(markdown).toContain('[role]');
  });

  it('leaves a placeholder when the CV has no measurable achievement', () => {
    const { markdown, missing } = buildCoverLetter('# Ana\n\n## EXPERIENCIA\n\n- Something vague', {
      lang: 'en',
      role: 'Dev',
      company: 'Acme',
    });
    expect(missing).toContain('achievements');
    expect(markdown).toContain('[two achievements from your CV, with a number each]');
  });

  it('never invents a name that is not in the CV', () => {
    const { markdown, missing, name } = buildCoverLetter(
      '## EXPERIENCIA\n\n- Led the migration that cut deploys by 45%',
      { lang: 'en', role: 'Dev', company: 'Acme' },
    );
    expect(name).toBe('');
    expect(missing).toContain('name');
    expect(markdown).not.toContain('# ');
  });

  it('always produces a printable document, even from an empty CV', () => {
    const { markdown } = buildCoverLetter('', { lang: 'en' });
    expect(markdown).toContain('**Application: [the role]**');
    expect(coverLetterToPlainText(markdown).length).toBeGreaterThan(0);
  });
});

describe('coverLetterToPlainText', () => {
  it('drops the Markdown and keeps every word', () => {
    const { markdown } = buildCoverLetter(CV, {
      lang: 'en',
      role: 'Frontend Engineer',
      company: 'Globex',
    });
    const plain = coverLetterToPlainText(markdown);
    expect(plain).not.toMatch(/[#*]/);
    expect(plain).toContain('Ana Gomez');
    expect(plain).toContain('- Led the migration');
  });
});

describe('letterPrintDocument', () => {
  it('is a self contained A4 document with the layout of the CV', () => {
    const { markdown } = buildCoverLetter(CV, {
      lang: 'en',
      role: 'Frontend Engineer',
      company: 'Globex',
    });
    const html = letterPrintDocument(markdown, {
      fontSize: 13,
      marginX: 28,
      marginY: 24,
      fontFamily: 'Arial',
      textColor: '#1e293b',
    });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page { size: A4;');
    expect(html).toContain('margin: 6.3mm 7.4mm');
    expect(html).toContain('font-size: 13px');
    expect(html).toContain('Frontend Engineer at Globex');

    expect(html).toContain('<strong>Application: Frontend Engineer at Globex</strong>');
    expect(html).not.toContain('<script');
  });

  it('escapes the characters that would break the document', () => {
    const html = letterPrintDocument('# <Ana & Co>\n\nSomething <script>alert(1)</script>', {
      fontSize: 13,
    });
    expect(html).toContain('&lt;Ana &amp; Co&gt;');
    expect(html).not.toContain('<script>alert');
  });
});

const POSTING = `Senior Frontend Engineer at Globex

We are looking for a Senior Frontend Engineer to join our team.

About the role:
- You will build accessible React interfaces with TypeScript.
- You will work with design systems and frontend testing.
- Frontend performance and accessibility are our priority.
- You will collaborate with backend services written in Go.

Requirements: React, TypeScript, frontend testing, accessibility, design systems.
`;

describe('readJobBrief', () => {
  it('reads the role and the company out of the posting, without inventing them', () => {
    const brief = readJobBrief(POSTING);
    expect(brief.role).toBe('Senior Frontend Engineer');
    expect(brief.company).toBe('Globex');
  });

  it('keeps the words the posting repeats, because those are the ones it is about', () => {
    const brief = readJobBrief(POSTING);
    expect(brief.requirements).toEqual(expect.arrayContaining(['frontend', 'accessibility']));

    expect(brief.requirements.length).toBeLessThanOrEqual(5);
    expect(brief.requirements).not.toEqual(expect.arrayContaining(['will', 'with', 'the', 'team']));
  });

  it('says nothing about a posting that is not there', () => {
    expect(readJobBrief('')).toEqual({ role: '', company: '', requirements: [] });
    expect(readJobBrief('   ').requirements).toEqual([]);
  });
});

describe('buildCoverLetter for a posting', () => {
  it('takes the role and the company from the offer when nobody typed them', () => {
    const letter = buildCoverLetter(CV, { lang: 'en', jobDescription: POSTING });
    expect(letter.role).toBe('Senior Frontend Engineer');
    expect(letter.company).toBe('Globex');
    expect(letter.missing).not.toContain('role');
    expect(letter.missing).not.toContain('company');
    expect(letter.markdown).toContain('**Application: Senior Frontend Engineer at Globex**');
  });

  it('never overrides what the user typed', () => {
    const letter = buildCoverLetter(CV, {
      lang: 'en',
      role: 'Staff Engineer',
      company: 'Initech',
      jobDescription: POSTING,
    });
    expect(letter.markdown).toContain('**Application: Staff Engineer at Initech**');
  });

  it('answers the requirements of the offer with what the CV already says', () => {
    const letter = buildCoverLetter(CV, {
      lang: 'en',
      role: 'Frontend Engineer',
      company: 'Globex',
      jobDescription: POSTING,
      match: {
        matchedKeywords: ['React', 'TypeScript', 'Accessibility'],
        missingKeywords: ['Kubernetes', 'Go'],
      },
    });
    expect(letter.requirements).toEqual(['react', 'typescript', 'accessibility']);
    expect(letter.markdown).toMatch(/Your posting asks for react, typescript and accessibility/);
    
    expect(letter.markdown).not.toMatch(/Kubernetes/i);
    expect(letter.markdown).not.toMatch(/Go\b/);
  });

  it('leaves a placeholder when the posting could not be read, rather than inventing', () => {
    const letter = buildCoverLetter(CV, { lang: 'en', jobDescription: 'Looking for someone.' });
    expect(letter.markdown).toContain('[the requirements of the offer you are answering]');
  });

  it('writes that paragraph in the language of the letter', () => {
    const letter = buildCoverLetter(CV, { lang: 'es', jobDescription: POSTING });
    expect(letter.markdown).toMatch(/Vuestra oferta pide/);
  });

  it('says nothing about a posting when there is none', () => {
    const letter = buildCoverLetter(CV, { lang: 'en', role: 'Dev', company: 'Acme' });
    expect(letter.markdown).not.toContain('Your posting asks for');
    expect(letter.markdown).not.toContain('requirements of the offer');
  });
});
