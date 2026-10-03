
import { describe, it, expect, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { buildPdf, fitToPages, renderPdfDocument } from '../../src/utils/pdfBuilder';
import {
  buildPdfModel,
  modelToPlainText,
  sanitizeForPdf,
  hexToRgb,
  resolveFontFamily,
} from '../../src/utils/pdfModel';
import { extractPdfText } from '../../src/utils/pdfText';
import { evaluatePdfText, evaluatePdf } from '../../src/utils/atsPdfEvaluation';
import { hashMarkdown, toHistoryRecord } from '../../src/utils/atsPdfHistory';
import { applyFix, applyAllFixes, canApplyFix, pendingFixes } from '../../src/utils/markdownFixes';
import { diffLines, diffStats, scoreTrend } from '../../src/utils/evaluationDiff';
import { artifactKey, clearPdfArtifacts, getPdfArtifact, peekPdfArtifact } from '../../src/utils/pdfArtifact';
import { scanContacts } from '../../src/utils/contactScan';

const styles = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  lineHeight: 1.48,
  primaryColor: '#1e293b',
  textColor: '#1e293b',
  subtextColor: '#475569',
  borderStyle: 'line',
  bulletStyle: '•',
  marginY: 24,
  marginX: 28,
  sectionGap: 16,
  itemGap: 10,
};

const CV = `# Ana Gomez

ana.gomez@mail.com | +34 600 123 456 | linkedin.com/in/anagomez

## EXPERIENCE

### **Acme Corp** | Madrid
**Senior Engineer** | *2021 – Present*
- Led the migration of 12 services to Kubernetes, cutting deploy time by 45%.
- Improved revenue by 30% through optimisation of the checkout flow.

## EDUCATION

### Universidad Politecnica
**BSc Computer Science** | *2015 – 2019*
`;

describe('pdfModel', () => {
  it('maps headings to the ATS classes of the preview', () => {
    const model = buildPdfModel(CV, styles);
    const kinds = model.blocks.map((block) => block.kind);
    expect(kinds).toEqual([
      'name',
      'paragraph',
      'section',
      'entry',
      'paragraph',
      'list',
      'section',
      'entry',
      'paragraph',
    ]);
  });

  it('uppercases section titles like the CSS text-transform', () => {
    const model = buildPdfModel(CV, styles);
    const section = model.blocks.find((block) => block.kind === 'section');
    expect(section.runs.map((run) => run.text).join('')).toBe('EXPERIENCE');
  });

  it('resolves inline markers into styled runs', () => {
    const model = buildPdfModel('**bold** __under__ *it* ~~old~~ `code`', styles);
    const runs = model.blocks[0].runs;
    expect(runs.find((run) => run.text === 'bold').bold).toBe(true);
    expect(runs.find((run) => run.text === 'under').underline).toBe(true);
    expect(runs.find((run) => run.text === 'it').italic).toBe(true);
    expect(runs.find((run) => run.text === 'old').strike).toBe(true);
    expect(runs.find((run) => run.text === 'code').mono).toBe(true);
  });

  it('keeps the link label and drops the URL, as the preview does', () => {
    const model = buildPdfModel('See [my portfolio](https://ana.dev).', styles);
    const text = modelToPlainText(model);
    expect(text).toBe('See my portfolio.');
    expect(text).not.toContain('https://');
  });

  it('reads the alignment wrappers written by the toolbar', () => {
    const model = buildPdfModel(
      '<div align="center">\n\n# Ana Gomez\n\n</div>\n\n## EXPERIENCE',
      styles,
    );
    expect(model.blocks[0].align).toBe('center');
    expect(model.blocks[1].align).toBe('left');
  });

  it('marks lists as ordered or unordered', () => {
    const model = buildPdfModel('- one\n- two\n\n1. first\n2. second', styles);
    const lists = model.blocks.filter((block) => block.kind === 'list');
    expect(lists[0].ordered).toBe(false);
    expect(lists[1].ordered).toBe(true);
    expect(modelToPlainText(model)).toContain('• one');
    expect(modelToPlainText(model)).toContain('1. first');
    expect(modelToPlainText(model, { bullet: '-' })).toContain('- one');
  });

  it('resolves inline markup inside list items', () => {
    const model = buildPdfModel('- **React** & [portfolio](https://ana.dev)', styles);
    const item = model.blocks[0].items[0];
    expect(item.find((run) => run.text === 'React').bold).toBe(true);
    expect(modelToPlainText(model)).toBe('• React & portfolio');
  });

  it('replaces glyphs that the standard PDF fonts cannot encode', () => {
    expect(sanitizeForPdf('shipped ✓ fast ▸ now')).toBe('shipped - fast - now');
    expect(sanitizeForPdf('Español • 100%')).toBe('Español • 100%');
    const model = buildPdfModel('- ✓ done', styles);
    expect(modelToPlainText(model)).toBe('• - done');
  });

  it('converts hex colors and maps font families to the standard fonts', () => {
    expect(hexToRgb('#1e293b')).toEqual([30, 41, 59]);
    expect(hexToRgb('nope')).toEqual([0, 0, 0]);
    expect(resolveFontFamily("'Merriweather', serif")).toBe('times');
    expect(resolveFontFamily("'JetBrains Mono', monospace")).toBe('courier');
    expect(resolveFontFamily("'Inter', sans-serif")).toBe('helvetica');
  });

  it('scales every size from the base font size', () => {
    const small = buildPdfModel(CV, { ...styles, fontSize: 10 });
    const big = buildPdfModel(CV, { ...styles, fontSize: 20 });
    expect(small.metrics.name).toBeCloseTo(10 * 0.75 * 2.1, 5);
    expect(big.metrics.name).toBeCloseTo(20 * 0.75 * 2.1, 5);
  });

  it('reads a <br> separator as empty space, never as text', async () => {
    const markdown =
      '# Ana Gomez\n\n## EXPERIENCE\n\nAcme Corp\n\nLed the migration cutting deploys by 45%.\n<br>\n\n## EDUCATION\n\nBSc Computer Science';
    const model = buildPdfModel(markdown, styles);
    const spacers = model.blocks.filter((block) => block.kind === 'spacer');

    expect(spacers).toHaveLength(1);
    expect(spacers[0].lines).toBe(1);
    expect(modelToPlainText(model)).toBe(
      'Ana Gomez\nEXPERIENCE\nAcme Corp\nLed the migration cutting deploys by 45%.\nEDUCATION\nBSc Computer Science',
    );

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { blob } = buildPdf(markdown, styles, { bullet: styles.bulletStyle });
    const extraction = await extractPdfText(await blob.arrayBuffer(), { pdfjs });
    expect(extraction.text).not.toMatch(/<br|<br\/?>|^---$/m);
    expect(
      evaluatePdfText(extraction, { lang: 'en' }).checks.find((check) => check.id === 'residue')
        .pass,
    ).toBe(true);
  });

  it('caps a wall of <br> so the layout cannot break', () => {
    const model = buildPdfModel(
      '# Ana\n\n<br><br><br><br><br><br><br><br>\n\n## SKILLS\n\n- React',
      styles,
    );
    const [spacer] = model.blocks.filter((block) => block.kind === 'spacer');
    expect(spacer.lines).toBe(3);
  });
});

describe('pdfBuilder', () => {
  it('produces a real PDF file with a text layer', async () => {
    const { blob, bytes, pages } = buildPdf(CV, styles);
    expect(blob.type).toBe('application/pdf');
    expect(bytes).toBeGreaterThan(1000);

    const header = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 5).arrayBuffer()));
    expect(header).toBe('%PDF-');
    expect(pages).toBe(1);
  });

  it('paginates long documents', () => {
    const long = Array.from(
      { length: 12 },
      (_, index) => `## SECTION ${index}\n\n- item one\n- item two`,
    ).join('\n\n');
    expect(buildPdf(long, styles).pages).toBeGreaterThan(1);
  });

  it('measures styled runs with real metrics, so text never overlaps', () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const text = vi.spyOn(doc, 'text');
    renderPdfDocument('**Hola** mundo *bien* `code`', styles, { doc });

    const positions = text.mock.calls.map((call) => ({ value: call[0], x: call[1] }));
    const hola = positions.find((position) => position.value === 'Hola');
    const mundo = positions.find((position) => position.value === 'mundo');

    expect(hola.x).toBeGreaterThan(0);
    expect(mundo.x).toBeGreaterThan(hola.x);

    expect(doc.getTextWidth('Hola')).toBeGreaterThan(0);
  });

  it('supports every border style and bullet without throwing', () => {
    for (const borderStyle of ['line', 'double', 'badge', 'minimal', 'thick-left']) {
      for (const bulletStyle of ['•', '-', '▸', '✓', '▪']) {
        const result = buildPdf(CV, { ...styles, borderStyle, bulletStyle });
        expect(result.bytes).toBeGreaterThan(500);
      }
    }
  });
});

describe('pdfText', () => {
  it('reads back the text layer of the generated PDF', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { blob } = buildPdf(CV, styles);
    const extraction = await extractPdfText(await blob.arrayBuffer(), { pdfjs });

    expect(extraction.pageCount).toBe(1);
    expect(extraction.text).toContain('Ana Gomez');
    expect(extraction.text).toContain('ana.gomez@mail.com');
    expect(extraction.text).toContain('EXPERIENCE');
    expect(extraction.text).toContain('Acme Corp');
    expect(extraction.text).toContain('45%');
    expect(extraction.text).toContain('BSc Computer Science');
    expect(extraction.wordCount).toBeGreaterThan(30);
  });

  it('draws a real bullet marker, so the ATS check can read the list', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const markdown =
      '# Ana\n\n- Led the migration cutting deploys by 45%\n- Reduced costs by 18000 euros';

    const { blob } = buildPdf(markdown, styles);
    const { text } = await extractPdfText(await blob.arrayBuffer(), { pdfjs });

    expect(text).toContain('\u2022 Led the migration cutting deploys by 45%');
    expect(text).not.toMatch(/\u00e2|\u20ac|�/);
  });

  it('never leaks Markdown or HTML syntax into the PDF', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const markdown =
      '# **Ana** __Gomez__\n\n<div align="center">\n\n## SKILLS\n\n</div>\n\n- **React** & SQL <span>x</span>\n- [portfolio](https://ana.dev)';
    const { blob } = buildPdf(markdown, styles);
    const { text } = await extractPdfText(await blob.arrayBuffer(), { pdfjs });

    expect(text).toContain('Ana');
    expect(text).toContain('SKILLS');
    expect(text).not.toMatch(/\*\*|__|<div|<span|\]\(http/);
    expect(text).not.toContain('https://');
  });

  it('keeps words separated so the ATS word count is real', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const long = `## EXPERIENCE\n\n${Array.from({ length: 80 }, (_, index) => `- Led project ${index} increasing revenue by ${index} percent across the platform`).join('\n')}`;
    const { blob, pages } = buildPdf(long, styles);
    const extraction = await extractPdfText(await blob.arrayBuffer(), { pdfjs });

    expect(pages).toBeGreaterThan(1);
    expect(extraction.pageCount).toBe(pages);
    expect(extraction.text).toContain('Led project 0 increasing');
    expect(extraction.wordCount).toBeGreaterThan(400);
  });
});

describe('evaluatePdfText', () => {
  const extraction = (text, extra = {}) => ({
    text,
    charCount: text.replace(/\s+/g, ' ').trim().length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    pageCount: 1,
    ...extra,
  });
  const byId = (result, id) => result.checks.find((check) => check.id === id);

  it('gives a low score to a PDF with no readable text', () => {
    const result = evaluatePdfText(extraction('CV'), { lang: 'en' });
    expect(result.score).toBeLessThan(40);
    expect(byId(result, 'text').pass).toBe(false);
  });

  it('rewards a complete, metric driven CV', () => {

    const text = [
      'Ana Gomez',
      'ana.gomez@mail.com | +34 600 123 456 | linkedin.com/in/anagomez',
      'Senior Backend Engineer with eight years building payment platforms for fintech and retail clients, focused on reliability, measurable performance and mentoring.',
      'I have led multi team projects end to end, from the discovery call to the production rollout, and I keep every commitment attached to a number so progress can be verified with the business.',
      'EXPERIENCE',
      'Acme Corp | Madrid',
      'Senior Engineer | 2021 - Present',
      'Led the migration of 12 services to Kubernetes, cutting deploy time by 45%.',
      'Improved revenue by 30% through optimisation of the checkout flow.',
      'Developed the design system adopted by 8 product teams.',
      'Automated the release pipeline and reduced incidents by 25%.',
      'Reduced infrastructure costs by 18000 euros per year.',
      'Coordinated a cross-functional team of 9 engineers.',
      'Optimised the onboarding funnel and grew activation by 18%.',
      'Engineered the idempotent payment API handling 12000 requests per second.',
      'Migrated the legacy billing service to an event driven architecture.',
      'Built the observability stack reducing mean time to recovery by 40%.',
      'Delivered the accessibility audit that unlocked the public sector market.',
      'Mentored six junior engineers, two of them promoted within a year.',
      'EDUCATION',
      'Universidad Politecnica',
      'BSc Computer Science | 2015 - 2019',
      'SKILLS',
      'Leadership, communication, teamwork, project management, agile, scrum,',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'en' });

    expect(result.wordCount).toBeGreaterThan(200);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.checks.every((check) => check.pass)).toBe(true);
    expect(result.suggestions).toEqual([]);
    expect(result.found.residue).toBeNull();
  });

  it('flags Markdown or HTML that leaked into the PDF', () => {
    const clean =
      'Ana Gomez\nEXPERIENCE\nAcme Corp\nLed the migration of 12 services to Kubernetes.';
    const result = evaluatePdfText(
      extraction(`${clean}\nSKILLS\n- **Leadership** <div align="center">x</div>`),
      { lang: 'en' },
    );
    expect(result.found.residue).toBe('**');
    expect(byId(result, 'residue').pass).toBe(false);
  });

  it('punishes more than two pages and offers the one page fix', () => {
    const result = evaluatePdfText(extraction(CV, { pageCount: 4 }), { lang: 'en' });
    expect(byId(result, 'pages').pass).toBe(false);
    expect(byId(result, 'pages').fix).toEqual({ type: 'fit' });
    expect(
      evaluatePdfText(extraction(CV), { lang: 'en' }).checks.find((c) => c.id === 'pages').fix,
    ).toBeUndefined();
  });

  it('detects contact data without matching year ranges as a phone', () => {
    expect(byId(evaluatePdfText(extraction(CV), { lang: 'en' }), 'contact').pass).toBe(true);
    expect(
      byId(evaluatePdfText(extraction('Ana\n\n2018 - 2024'), { lang: 'en' }), 'contact').pass,
    ).toBe(false);
  });

  it('offers a Markdown fix for missing contact data and summary', () => {
    const result = evaluatePdfText(extraction('Ana\n\nEXPERIENCE\nAcme'), { lang: 'en' });
    expect(byId(result, 'contact').fix).toEqual({ type: 'insertContact' });

    expect(byId(result, 'sections').fix).toEqual({ type: 'insertSummary', lang: 'en' });
  });

  it('flags bullets that carry neither a verb nor a number', () => {
    const text = [
      'Ana Gomez',
      'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana',
      'EXPERIENCE',
      'Acme Corp',
      '- Migration and billing work for the platform',
      '- Kubernetes, Docker, observability, dashboards',
      '- Led the migration of 12 services, cutting deploys by 45%',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'en' });
    const bullets = byId(result, 'bullets');
    expect(bullets.pass).toBe(false);
    expect(result.found.bullets).toBe(3);
    expect(result.found.emptyBullets).toBe(2);
  });

  it('flags a wall of text and a single dense page', () => {
    const dense = Array.from({ length: 1000 }, (_, index) => `word${index}`).join(' ');
    const result = evaluatePdfText(extraction(dense, { pageCount: 1 }), { lang: 'en' });
    expect(byId(result, 'density').pass).toBe(false);
    expect(byId(result, 'density').max).toBe(3);
    expect(byId(result, 'length').pass).toBe(false);
  });

  it('flags keyword stuffing but not natural repetition', () => {
    const stuffed = Array.from(
      { length: 20 },
      () => 'leadership leadership leadership teamwork',
    ).join(' ');
    const result = evaluatePdfText(extraction(stuffed), { lang: 'en' });
    expect(byId(result, 'stuffing').pass).toBe(false);
    expect(result.found.stuffed).toEqual(expect.arrayContaining(['leadership']));

    const natural = [
      'Led the agile team that rebuilt the billing platform, mentoring two junior engineers along the way.',
      'Improved delivery time by 30% and reduced incidents by 25% across the cloud infrastructure.',
      'Coordinated a cross-functional project with product, design and support to ship the roadmap on time.',
      'Built the automated testing pipeline, raising cloud reliability and cutting manual verification work.',
      'Skills: leadership, teamwork, agile, scrum, python, testing, communication, project management, cloud.',
    ].join(' ');
    const naturalResult = evaluatePdfText(extraction(natural), { lang: 'en' });
    expect(byId(naturalResult, 'stuffing').pass).toBe(true);
    expect(naturalResult.found.stuffed).toEqual([]);
  });

  it('evaluates Spanish CVs with the Spanish lexicon', () => {
    const text = [
      'Ana Gomez',
      'ana.gomez@mail.com | +34 600 123 456 | linkedin.com/in/anagomez',
      'EXPERIENCIA',
      'Acme Corp',
      'Ingeniera Senior | 2021 - Presente',
      'Lidere la migracion de 12 servicios reduciendo el tiempo un 45%.',
      'Mejore los ingresos un 30% con la optimizacion del checkout.',
      'Desarrolle el sistema de diseno adoptado por 8 equipos de producto.',
      'Automatice el pipeline de despliegue y reduje los incidentes un 25%.',
      'Reduje los costes de infraestructura en 18000 euros al año.',
      'Coordine a un equipo transversal de 9 ingenieros durante dos años.',
      'EDUCACION',
      'Universidad Politecnica',
      'Grado en Informatica | 2015 - 2019',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'es' });

    expect(byId(result, 'contact').pass).toBe(true);
    expect(result.found.verbs).toEqual(expect.arrayContaining(['lideré', 'mejoré', 'desarrollé']));
    expect(result.suggestions.every((suggestion) => typeof suggestion === 'string')).toBe(true);
  });

  it('measures a Spanish CV with the Spanish lexicon even with the UI in English', () => {
    const text = [
      'Carlos Mendoza',
      'carlos.mendoza@email.com | +34 612 345 678 | linkedin.com/in/carlosmendoza',
      'EXPERIENCIA',
      'Acme Corp',
      'Lidere la migracion de 12 servicios reduciendo el tiempo un 45%.',
      'Mejore los ingresos un 30% con la optimizacion del checkout.',
      'Disene el sistema de diseno adoptado por 8 equipos de producto.',
      'Automaticé el pipeline de despliegue y reduje los incidentes un 25%.',
      'Reduje los costes de infraestructura en 18000 euros al año.',
      'Coordine a un equipo transversal de 9 ingenieros durante dos años.',
      'FORMACION',
      'Universidad Politecnica',
      'Grado en Informatica',
      'HABILIDADES',
      'Liderazgo, comunicacion, gestion de proyectos, agilidad, cloud, python',
    ].join('\n');

    const englishUi = evaluatePdfText(extraction(text), { lang: 'en' });
    const spanishUi = evaluatePdfText(extraction(text), { lang: 'es' });


    expect(englishUi.cvLang).toBe('es');
    expect(spanishUi.cvLang).toBe('es');
    expect(byId(englishUi, 'sections').pass).toBe(true);
    expect(byId(englishUi, 'sections').points).toBe(10);
    expect(englishUi.found.sectionLabels).toEqual(
      expect.arrayContaining(['EXPERIENCIA', 'FORMACIÓN', 'HABILIDADES']),
    );
    expect(byId(englishUi, 'verbs').pass).toBe(true);
    expect(byId(englishUi, 'keywords').pass).toBe(true);
    expect(englishUi.score).toBe(spanishUi.score);
    expect(byId(englishUi, 'sections').title).toBe('Section headings');
  });

  it('measures an English CV with the English lexicon even with the UI in Spanish', () => {
    const text = [
      'Ana Gomez',
      'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana',
      'EXPERIENCE',
      'Acme Corp',
      'Led the migration of 12 services to Kubernetes, cutting deploy time by 45%.',
      'Improved revenue by 30% through optimisation of the checkout flow.',
      'Developed the design system adopted by 8 product teams.',
      'Automated the release pipeline and reduced incidents by 25%.',
      'Built the observability stack reducing mean time to recovery by 40%.',
      'EDUCATION',
      'Universidad Politecnica',
      'BSc Computer Science',
      'SKILLS',
      'Leadership, communication, teamwork, project management, agile',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'es' });
    expect(result.cvLang).toBe('en');
    expect(byId(result, 'sections').pass).toBe(true);
    expect(byId(result, 'verbs').pass).toBe(true);
  });

  it('only judges the bullets of the work experience section', () => {
    const text = [
      'Ana Gomez',
      'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana',
      'EXPERIENCE',
      'Acme Corp',
      '- Led the migration of 12 services to Kubernetes, cutting deploy time by 45%.',
      '- Reduced infrastructure costs by 18000 euros per year.',
      'EDUCATION',
      'Universidad Politecnica',
      '- Computer Science and Mathematics',
      'LANGUAGES',
      '- Spanish and English',
      'INTERESTS',
      '- Chess, running and photography',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'en' });


    expect(result.found.bullets).toBe(2);
    expect(result.found.emptyBullets).toBe(0);
    expect(byId(result, 'bullets').pass).toBe(true);
  });

  it('still flags the empty bullets of the experience section', () => {
    const text = [
      'Ana Gomez',
      'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana',
      'EXPERIENCE',
      'Acme Corp',
      '- Migration and billing work for the platform',
      '- Kubernetes, Docker and dashboards',
      '- Led the migration, cutting deploys by 45%',
      'SKILLS',
      '- Leadership and teamwork',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'en' });
    expect(result.found.bullets).toBe(3);
    expect(result.found.emptyBullets).toBe(2);
    expect(byId(result, 'bullets').pass).toBe(false);
    expect(byId(result, 'bullets').examples[0]).toContain('Migration and billing work');
  });

  it('does not penalise bullets when there is no experience section at all', () => {
    const text =
      'Ana Gomez\nana@mail.com | +34 600 123 456 | linkedin.com/in/ana\n\nSKILLS\n\n- Leadership and teamwork\n- Cloud and automation';
    const result = evaluatePdfText(extraction(text), { lang: 'en' });
    expect(result.found.bullets).toBe(0);
    expect(byId(result, 'bullets').pass).toBe(true);
  });

  it('measures keywords with the lexicon of the CV language', () => {
    const spanish = evaluatePdfText(
      extraction('Liderazgo, colaboracion, gestion de proyectos, innovacion, cliente, agilidad.'),
      { lang: 'es' },
    );
    expect(spanish.found.keywords.length).toBeGreaterThanOrEqual(4);

    const sameTextInEnglish = evaluatePdfText(
      extraction('Liderazgo, colaboracion, gestion de proyectos, innovacion, cliente, agilidad.'),
      { lang: 'en' },
    );
    expect(sameTextInEnglish.found.keywords.length).toBe(0);
  });

  it('explains with examples every check that fails', () => {
    const result = evaluatePdfText(extraction('Ana\n\n2018 - 2024', { pageCount: 5 }), {
      lang: 'en',
    });
    const failed = result.checks.filter((check) => !check.pass);

    expect(failed.length).toBeGreaterThan(0);
    failed.forEach((check) => {
      expect(check.examples.length, `${check.id} has no examples`).toBeGreaterThan(0);
      check.examples.forEach((example) => expect(typeof example).toBe('string'));
    });

    result.checks
      .filter((check) => check.pass)
      .forEach((check) => expect(check.examples).toEqual([]));
  });

  it('names the missing contact fields and sections', () => {
    const result = evaluatePdfText(extraction('Ana\n\n## EXPERIENCE\n\nAcme Corp'), { lang: 'en' });
    const contact = result.checks.find((check) => check.id === 'contact');
    expect(contact.examples.join(' ')).toContain('Missing');
    expect(contact.examples.join(' ')).toContain('+34 600 000 000');
    expect(result.found.missingSections).toEqual(expect.arrayContaining(['SUMMARY', 'SKILLS']));

    const spanish = evaluatePdfText(extraction('Ana\n\n## EXPERIENCIA\n\nAcme'), { lang: 'es' });
    expect(spanish.found.missingSections).toContain('HABILIDADES');
  });

  it('quotes the bullets that say nothing', () => {
    const text = [
      'Ana Gomez',
      'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana',
      'EXPERIENCE',
      'Acme Corp',
      '- Kubernetes and Docker for the platform',
      '- Led the migration, cutting deploys by 45%',
    ].join('\n');
    const bullets = evaluatePdfText(extraction(text), { lang: 'en' }).checks.find(
      (check) => check.id === 'bullets',
    );
    expect(bullets.examples[0]).toContain('Kubernetes and Docker for the platform');
  });

  it('suggests the keywords the role of the CV expects', () => {
    const text = [
      '# Ana Gomez',
      'Senior Frontend Engineer',
      'ana@mail.com | +34 600 123 456 | linkedin.com/in/ana',
      'EXPERIENCE',
      'Acme',
      'Built the interface with react and css.',
    ].join('\n');
    const result = evaluatePdfText(extraction(text), { lang: 'en' });
    expect(result.found.role).toBe('frontend');
    const keywords = result.checks.find((check) => check.id === 'keywords');

    expect(keywords.examples.length).toBeGreaterThan(0);
    expect(result.found.roleKeywords).toContain('react');
  });
});

describe('evaluatePdf', () => {
  it('scores the PDF it just generated, not the Markdown', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const result = await evaluatePdf(CV, styles, { lang: 'en', deps: { pdfjs } });

    expect(result.pdf.type).toBe('application/pdf');
    expect(result.text).not.toMatch(/\*\*|__|^\s*#/m);
    expect(result.found.residue).toBeNull();
    expect(result.sourceHash).toBe(hashMarkdown(CV));
    expect(result.createdAt).toBeTruthy();
    expect(result.bytes).toBeGreaterThan(1000);
  });

  it('stores a serialisable history record without the binary file', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const result = await evaluatePdf(CV, styles, { lang: 'en', deps: { pdfjs } });
    const record = toHistoryRecord(result);

    expect(record.id).toContain(record.sourceHash);
    expect(record.pdf).toBeUndefined();
    expect(() => JSON.stringify(record)).not.toThrow();
    expect(JSON.parse(JSON.stringify(record)).score).toBe(record.score);
  });
});

describe('fitToPages', () => {
  const longCv = `# Ana Gomez\n\nana@mail.com | +34 600 123 456 | linkedin.com/in/ana\n\n## EXPERIENCE\n\n${Array.from({ length: 50 }, (_, index) => `- Led project ${index} reducing operational cost by ${index + 3} percent across the platform and its billing services`).join('\n')}\n\n## EDUCATION\n\nBSc Computer Science\n\n## SKILLS\n\nLeadership, communication, teamwork`;

  it('leaves a document that already fits untouched', () => {
    const result = fitToPages(CV, styles, { targetPages: 1 });
    expect(result.changed).toBe(false);
    expect(result.styles).toBe(styles);
    expect(result.pages).toBe(result.originalPages);
  });

  it('shrinks a long document until it fits on one page', () => {
    const before = renderPdfDocument(longCv, styles).pages;
    expect(before).toBeGreaterThan(1);

    const result = fitToPages(longCv, styles, { targetPages: 1 });

    expect(result.changed).toBe(true);
    expect(result.pages).toBe(1);
    expect(result.styles.fontSize).toBeLessThanOrEqual(styles.fontSize);
    expect(result.styles.fontSize).toBeGreaterThanOrEqual(9);
    expect(result.styles.lineHeight).toBeGreaterThanOrEqual(1.2);
    expect(renderPdfDocument(longCv, result.styles).pages).toBe(1);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('never deletes a style value that is not part of the layout', () => {
    const result = fitToPages(longCv, styles, { targetPages: 1 });
    expect(result.styles.fontFamily).toBe(styles.fontFamily);
    expect(result.styles.bulletStyle).toBe(styles.bulletStyle);
    expect(result.styles.primaryColor).toBe(styles.primaryColor);
  });

  
  it('reports no change when even the smallest layout does not fit', () => {
    const huge = longCv + '\n\n## EXTRA\n\n' + 'word '.repeat(4000);
    const result = fitToPages(huge, styles, { targetPages: 1 });
    expect(result.changed).toBe(false);
    expect(result.styles).toBe(styles);
  }, 30000);
});

describe('pdfArtifact', () => {
  it('serves the same file for the same content and a new one when it changes', () => {
    clearPdfArtifacts();
    const first = getPdfArtifact(CV, styles);
    expect(peekPdfArtifact(CV, styles)).toBe(first);
    expect(getPdfArtifact(CV, styles).blob).toBe(first.blob);

    const edited = getPdfArtifact(`${CV}\n\n- Led the migration`, styles);
    expect(edited.blob).not.toBe(first.blob);
    expect(edited.key).not.toBe(first.key);

    clearPdfArtifacts();
    expect(peekPdfArtifact(CV, styles)).toBeNull();
  });

  it('keys the file by every style that changes the layout', () => {
    const base = artifactKey(CV, styles);
    expect(artifactKey(CV, { ...styles, fontSize: 12 })).not.toBe(base);
    expect(artifactKey(CV, { ...styles, marginY: 30 })).not.toBe(base);
    expect(artifactKey(CV, { ...styles, borderStyle: 'none' })).not.toBe(base);
    expect(artifactKey(CV, styles)).toBe(base);
  });

  it('evaluates and downloads one single file', async () => {
    clearPdfArtifacts();
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const evaluation = await evaluatePdf(CV, styles, { lang: 'en', deps: { pdfjs } });

    expect(peekPdfArtifact(CV, styles).blob).toBe(evaluation.pdf);
    expect(evaluation.artifactKey).toBe(artifactKey(CV, styles));
    expect(evaluation.bytes).toBe(peekPdfArtifact(CV, styles).bytes);
  });
});

describe('markdown fixes', () => {
  it('inserts a contact block under the name, and only once', () => {
    const cv = '# Ana Gomez\n\n## EXPERIENCE\n\nAcme Corp';
    expect(canApplyFix(cv, { type: 'insertContact' }, 'en')).toBe(true);
    const fixed = applyFix(cv, { type: 'insertContact' }, 'en').markdown;
    expect(fixed).toContain('email@example.com');
    expect(fixed.indexOf('email@example.com')).toBeLessThan(fixed.indexOf('## EXPERIENCE'));
    expect(applyFix(fixed, { type: 'insertContact' }, 'en')).toBeNull();
  });

  it('writes the contact block in Spanish for a Spanish CV', () => {
    const fixed = applyFix('# Ana Gomez\n', { type: 'insertContact' }, 'es').markdown;
    expect(fixed).toContain('email@ejemplo.com');
  });

  it('inserts a summary section and never duplicates it', () => {
    const cv =
      '# Ana Gomez\n\nana@mail.com | +34 600 123 456 | linkedin.com/in/ana\n\n## EXPERIENCE\n\nAcme Corp';
    const fixed = applyFix(cv, { type: 'insertSummary' }, 'en').markdown;
    expect(fixed).toContain('## PROFESSIONAL SUMMARY');
    expect(fixed.indexOf('PROFESSIONAL SUMMARY')).toBeLessThan(fixed.indexOf('## EXPERIENCE'));
    expect(applyFix(fixed, { type: 'insertSummary' }, 'en')).toBeNull();
    expect(applyFix('## Resumen\n\nTexto', { type: 'insertSummary' }, 'es')).toBeNull();
  });

  it('returns null for an unknown or no longer needed fix', () => {
    expect(applyFix('# Ana', { type: 'doesNotExist' })).toBeNull();
    expect(applyFix('# Ana', null)).toBeNull();
  });

  it('applies every safe fix at once and leaves the rest of the CV alone', () => {
    const cv = '# Ana Gomez\n\n## EXPERIENCE\n\nAcme Corp';
    const checks = [
      { id: 'contact', pass: false, fix: { type: 'insertContact' } },
      { id: 'summary', pass: false, fix: { type: 'insertSummary' } },
      { id: 'words', pass: false, fix: null },
      { id: 'layout', pass: false, fix: { type: 'fitOnePage' } },
    ];
    expect(pendingFixes(cv, checks, 'en').map((fix) => fix.type)).toEqual([
      'insertContact',
      'insertSummary',
    ]);

    const result = applyAllFixes(cv, checks, 'en');
    expect(result.applied).toEqual(['insertContact', 'insertSummary']);
    expect(result.markdown).toContain('## PROFESSIONAL SUMMARY');
    expect(result.markdown).toContain('email@example.com');
    expect(result.markdown).toContain('## EXPERIENCE');

    expect(result.markdown.indexOf('email@example.com')).toBeLessThan(
      result.markdown.indexOf('## PROFESSIONAL SUMMARY'),
    );
    expect(result.markdown.indexOf('## PROFESSIONAL SUMMARY')).toBeLessThan(
      result.markdown.indexOf('## EXPERIENCE'),
    );
  });

  it('has nothing to fix when every safe check already passes', () => {
    const cv =
      '# Ana Gomez\n\nana@mail.com | +34 600 123 456 | linkedin.com/in/ana\n\n## PROFESSIONAL SUMMARY\n\nTexto\n\n## EXPERIENCE\n\nAcme Corp';
    const checks = [
      { id: 'contact', pass: false, fix: { type: 'insertContact' } },
      { id: 'summary', pass: false, fix: { type: 'insertSummary' } },
    ];
    expect(pendingFixes(cv, checks, 'en')).toEqual([]);
    expect(applyAllFixes(cv, checks, 'en').applied).toEqual([]);
  });
});

describe('contactScan', () => {
  it('finds the email, the phone and the profile of a CV', () => {
    const result = scanContacts(
      '# Ana Gomez\n\nana.gomez@mail.com | +34 600 123 456 | linkedin.com/in/anagomez',
    );
    expect(result.byKind.email.map((item) => item.value)).toEqual(['ana.gomez@mail.com']);
    expect(result.byKind.phone.map((item) => item.value)).toEqual(['+34 600 123 456']);
    expect(result.byKind.link.map((item) => item.value)).toEqual(['linkedin.com/in/anagomez']);
    expect(result.problems).toEqual([]);
  });

  it('never reads a year range or a metric as a phone number', () => {
    const result = scanContacts(
      '## EDUCATION\n\nBSc | 2015 - 2019\n\nImproved revenue by 30% in 2021.\n\nReduced costs by 18000 EUR.',
    );
    expect(result.byKind.phone).toEqual([]);
  });

  it('does not read digits inside an email, a URL or a link label', () => {
    const result = scanContacts(
      'ana+34600123456@mail.com and [my profile](https://linkedin.com/in/ana-123456789)',
    );
    expect(result.byKind.phone).toEqual([]);
    expect(result.byKind.email).toHaveLength(1);

    expect(result.byKind.link).toHaveLength(1);
    expect(result.byKind.link[0].hidden).toBe(true);
  });

  it('does not read a mailto or a profile mail as a link', () => {
    const result = scanContacts('[email me](mailto:carlos@mail.com) | [call](tel:+34612345678)');
    expect(result.byKind.link).toEqual([]);
    expect(result.byKind.email).toHaveLength(1);
  });

  it('keeps one link per site, the most specific one', () => {
    const line =
      'carlos.mendoza@email.com | +34 612 345 678 | Madrid | linkedin.com/in/carlosmendoza | github.com/carlosmendoza';
    const result = scanContacts(line);
    expect(result.byKind.email.map((entry) => entry.value)).toEqual(['carlos.mendoza@email.com']);
    expect(result.byKind.phone.map((entry) => entry.value)).toEqual(['+34 612 345 678']);
    expect(result.byKind.link.map((entry) => entry.value)).toEqual([
      'linkedin.com/in/carlosmendoza',
      'github.com/carlosmendoza',
    ]);

    expect(result.problems).toEqual([]);
  });

  it('reads the label of a Markdown link, not its target', () => {
    const line =
      '[carlos.mendoza@email.com](mailto:carlos.mendoza@email.com) | +34 612 345 678 | Madrid, España | [linkedin.com/in/carlosmendoza](https://linkedin.com) | [github.com/carlosmendoza](https://github.com)';
    const result = scanContacts(line);
    expect(result.byKind.email.map((entry) => entry.value)).toEqual(['carlos.mendoza@email.com']);
    expect(result.byKind.phone).toHaveLength(1);

    expect(result.byKind.link.map((entry) => entry.value)).toEqual([
      'linkedin.com/in/carlosmendoza',
      'github.com/carlosmendoza',
    ]);
    expect(result.byKind.link.map((entry) => entry.href)).toEqual([
      'https://linkedin.com',
      'https://github.com',
    ]);
    expect(result.problems).toEqual([]);
  });

  it('collapses a bare domain and its full URL into the most specific link', () => {
    const result = scanContacts(
      'linkedin.com/in/carlosmendoza and [profile](https://linkedin.com/in/carlosmendoza) and https://linkedin.com',
    );
    expect(result.byKind.link).toHaveLength(1);
    expect(result.byKind.link[0].value).toContain('/in/carlosmendoza');
  });

  it('flags a bare domain so the link is clickable in the PDF', () => {
    const [link] = scanContacts('github.com/anagomez').byKind.link;
    expect(link.issues).toContain('noProtocol');
    expect(link.href).toBe('https://github.com/anagomez');
  });

  it('flags an email without domain extension', () => {
    const [email] = scanContacts('write me at ana.gomez@mail').byKind.email;
    expect(email.value).toBe('ana.gomez@mail');
    expect(email.issues).toContain('noTld');
    expect(scanContacts('write me at ana.gomez@mail').problems).toContain('malformedEmail');
  });

  it('flags two emails or two phones as ambiguous', () => {
    const twoEmails = scanContacts('ana@mail.com | ana.gomez@work.com');
    expect(twoEmails.byKind.email).toHaveLength(2);
    expect(twoEmails.problems).toContain('multipleEmails');

    const twoPhones = scanContacts('+34 600 123 456 | +34 911 223 344');
    expect(twoPhones.byKind.phone).toHaveLength(2);
    expect(twoPhones.problems).toContain('multiplePhones');
  });

  it('reports the document level problems when data is missing', () => {
    const result = scanContacts('# Ana Gomez\n\n## EXPERIENCE\n\nAcme Corp');
    expect(result.items).toEqual([]);
    expect(result.problems).toEqual(expect.arrayContaining(['noEmail', 'noPhone', 'noLink']));
  });

  it('gives a stable id per value so verification survives a re-render', () => {
    const first = scanContacts('ana@mail.com').items[0];
    const second = scanContacts('# Ana\n\nana@mail.com\n\n# Other').items[0];
    expect(first.id).toBe(second.id);
    expect(first.start).not.toBe(second.start);
  });
});

describe('evaluationDiff', () => {
  it('reports added and removed lines', () => {
    const changes = diffLines('one\ntwo\nthree', 'one\ntwo\nfour');
    expect(
      changes.filter((change) => change.type === 'added').map((change) => change.text),
    ).toEqual(['four']);
    expect(
      changes.filter((change) => change.type === 'removed').map((change) => change.text),
    ).toEqual(['three']);
    expect(diffStats('one\ntwo', 'one\ntwo')).toEqual({ added: 0, removed: 0, changed: false });
    expect(diffStats('a\nb', 'a\nc')).toEqual({ added: 1, removed: 1, changed: true });
  });

  it('summarises the score trend of the history, oldest first', () => {
    const history = [
      { id: 'c', score: 90, createdAt: '3' },
      { id: 'b', score: 70, createdAt: '2' },
      { id: 'a', score: 60, createdAt: '1' },
    ];
    const trend = scoreTrend(history);
    expect(trend.points.map((point) => point.score)).toEqual([60, 70, 90]);
    expect(trend.delta).toBe(30);
    expect(trend.direction).toBe('up');

    const down = scoreTrend([
      { id: 'b', score: 40, createdAt: '2' },
      { id: 'a', score: 80, createdAt: '1' },
    ]);
    expect(down.direction).toBe('down');
    expect(scoreTrend([{ id: 'a', score: 80 }]).direction).toBe('flat');
  });
});
