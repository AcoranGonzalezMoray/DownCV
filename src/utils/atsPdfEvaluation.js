import { translations } from '../data/translations';
import { extractPdfText } from './pdfText';
import { getPdfArtifact } from './pdfArtifact';
import { hashMarkdown } from './atsPdfHistory';
import { ATS_KEYWORDS, ATS_KEYWORDS_ES, ENGLISH_VERBS, SPANISH_VERBS } from './atsScorer';

const SECTIONS = {
  en: [
    { key: 'summary', label: 'SUMMARY', re: /summary|profile|objective/i },
    { key: 'experience', label: 'EXPERIENCE', re: /experience|employment|work history/i },
    { key: 'education', label: 'EDUCATION', re: /education|academic/i },
    { key: 'skills', label: 'SKILLS', re: /skills|technical|competenc/i },
    { key: 'certifications', label: 'CERTIFICATIONS', re: /certificat|licen[sc]e|award/i },
    { key: 'projects', label: 'PROJECTS', re: /project/i },
    { key: 'languages', label: 'LANGUAGES', re: /languages?/i },
  ],
  es: [
    { key: 'summary', label: 'RESUMEN', re: /resumen|perfil|objetivo/i },
    { key: 'experience', label: 'EXPERIENCIA', re: /experiencia|trayectoria/i },
    { key: 'education', label: 'FORMACIÓN', re: /formaci[oó]n|educaci[oó]n|estudios/i },
    { key: 'skills', label: 'HABILIDADES', re: /habilidades|competencias|skills/i },
    { key: 'certifications', label: 'CERTIFICACIONES', re: /certificaci[oó]n|licencia|premio/i },
    { key: 'projects', label: 'PROYECTOS', re: /proyecto/i },
    { key: 'languages', label: 'IDIOMAS', re: /idiomas?/i },
  ],
};

const ROLE_KEYWORDS = {
  en: {
    frontend: ['react', 'css', 'accessibility', 'responsive', 'testing', 'performance'],
    backend: ['api', 'microservices', 'database', 'sql', 'caching', 'reliability'],
    fullstack: ['react', 'node.js', 'api', 'database', 'ci/cd', 'testing'],
    devops: ['ci/cd', 'kubernetes', 'terraform', 'monitoring', 'automation', 'reliability'],
    data: ['sql', 'tableau', 'etl', 'dashboards', 'python', 'analytics'],
    ml: ['machine learning', 'python', 'mlops', 'llm', 'data', 'pipelines'],
    qa: ['test automation', 'testing', 'regression', 'ci/cd', 'quality assurance'],
    mobile: ['android', 'ios', 'react native', 'testing', 'performance'],
    product: ['roadmap', 'stakeholder', 'agile', 'metrics', 'prioritization'],
    sales: ['crm', 'pipeline', 'negotiation', 'quota', 'prospecting'],
    marketing: ['seo', 'campaign', 'analytics', 'content', 'conversion'],
    design: ['ux', 'figma', 'prototyping', 'accessibility', 'research'],
  },
  es: {
    frontend: ['react', 'css', 'accesibilidad', 'responsive', 'testing', 'rendimiento'],
    backend: ['api', 'microservicios', 'base de datos', 'sql', 'cache', 'fiabilidad'],
    fullstack: ['react', 'node.js', 'api', 'base de datos', 'ci/cd', 'testing'],
    devops: [
      'ci/cd',
      'kubernetes',
      'terraform',
      'monitorizaci[oó]n',
      'automatizaci[oó]n',
      'fiabilidad',
    ],
    data: ['sql', 'tableau', 'etl', 'dashboards', 'python', 'analítica'],
    ml: ['machine learning', 'python', 'mlops', 'llm', 'datos', 'pipelines'],
    qa: ['automatizaci[oó]n de pruebas', 'testing', 'regresi[oó]n', 'ci/cd', 'calidad'],
    mobile: ['android', 'ios', 'react native', 'testing', 'rendimiento'],
    product: ['roadmap', 'stakeholders', 'agil', 'm[eé]tricas', 'priorizaci[oó]n'],
    sales: ['crm', 'pipeline', 'negociaci[oó]n', 'cuota', 'prospeccci[oó]n'],
    marketing: ['seo', 'campaign', 'analítica', 'contenidos', 'conversi[oó]n'],
    design: ['ux', 'figma', 'prototipado', 'accesibilidad', 'investigaci[oó]n'],
  },
};

const ROLE_MARKERS = [
  { role: 'fullstack', re: /full[\s-]?stack/i },
  { role: 'frontend', re: /front[\s-]?end|react|vue|angular|ui engineer/i },
  { role: 'backend', re: /back[\s-]?end|api|microservice|golang|java developer/i },
  { role: 'devops', re: /devops|\bsre\b|platform|infrastructure|kubernetes|terraform/i },
  { role: 'ml', re: /machine learning|deep learning|\bai\b|mlops|llm/i },
  { role: 'data', re: /data scien|analytics|analista|warehouse|etl|tableau|power ?bi/i },
  { role: 'qa', re: /\bqa\b|quality assurance|test engineer|tester/i },
  { role: 'mobile', re: /android|ios|flutter|react native/i },
  { role: 'product', re: /product (manager|owner)|product management|roadmap/i },
  { role: 'sales', re: /sales|account executive|commercial/i },
  { role: 'marketing', re: /marketing|growth|seo/i },
  { role: 'design', re: /designer|product design|\bux\b|\bui\b/i },
];

function detectRole(flat) {
  const match = ROLE_MARKERS.find((candidate) => candidate.re.test(flat));
  return match ? match.role : null;
}

const LANGUAGE_MARKERS = {
  es: [
    'experiencia',
    'experiencias',
    'formacion',
    'habilidades',
    'resumen',
    'perfil',
    'idiomas',
    'proyectos',
    'proyecto',
    'certificaciones',
    'trayectoria',
    'estudios',
    'conocimientos',
    'liderazgo',
    'gestion',
    'equipo',
    'anos',
    'empresa',
    'puesto',
    'responsable',
    'desarrollo',
    'mejore',
    'lidere',
    'reduje',
    'aumente',
    'conseguí',
    'disene',
    'coordiné',
    'logro',
    'destacado',
    'publicaciones',
  ],
  en: [
    'experience',
    'experiences',
    'education',
    'skills',
    'summary',
    'profile',
    'languages',
    'projects',
    'project',
    'certifications',
    'work history',
    'employment',
    'knowledge',
    'leadership',
    'management',
    'team',
    'years',
    'company',
    'position',
    'responsible',
    'development',
    'improved',
    'led',
    'reduced',
    'increased',
    'achieved',
    'designed',
    'coordinated',
    'published',
    'highlights',
  ],
};

export function detectCvLanguage(text) {
  const flat = stripAccents(String(text || '').toLowerCase());
  if (flat.split(/\s+/).filter(Boolean).length < 15) {
    return null;
  }
  const score = (list) =>
    list.reduce(
      (total, word) => total + (new RegExp(`\\b${escapeRegExp(word)}`).test(flat) ? 1 : 0),
      0,
    );
  const spanish = score(LANGUAGE_MARKERS.es);
  const english = score(LANGUAGE_MARKERS.en);
  if (spanish === english) {
    return null;
  }
  return spanish > english ? 'es' : 'en';
}

export function splitIntoSections(text) {
  const sections = { intro: [] };
  let current = 'intro';
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const isHeading =
      line.length > 0 &&
      line.length <= 32 &&
      !BULLET_RE.test(line) &&
      SECTIONS.en.concat(SECTIONS.es).some((section) => section.re.test(line));
    if (isHeading) {
      const match = SECTIONS.en.concat(SECTIONS.es).find((section) => section.re.test(line));
      current = match.key;
      sections[current] = sections[current] || [];
      continue;
    }
    sections[current].push(raw);
  }
  return sections;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}\b/;
const PROFILE_RE = /(linkedin\.com|github\.com|behance\.net|https?:\/\/|www\.)/i;
const METRIC_RE =
  /(\d+\s?%|\$\s?\d+|\b\d+([.,]\d+)?\s?(k|m|mm|millones|thousand|million)\b|\b\d{2,}\b)/gi;
const RESIDUE_RE =
  /(\*\*|__|\]\(https?:|<div|<span|<table|&#\d+;|&amp;|&nbsp;|^\s{0,3}#{1,6}\s|\|\s*[-:]{2,})/m;
const MAX_STORED_TEXT = 8000;

const MAX_STORED_PAGE_TEXT = 4000;

const BULLET_RE = /^[•\-\u25aa\u25b8\u2713*]\s+/;
const VERB_AT_START_RE = /^[•\-\u25aa\u25b8\u2713*]?\s*([A-Za-z\u00C0-\u024F]+)/;
const LONG_PARAGRAPH_WORDS = 60;
const STUFFING_REPEAT = 6;
const STUFFING_DENSITY = 0.12;
const DENSE_WORDS_PER_PAGE = 750;

function grade(score) {
  if (score >= 90) {
    return 'A';
  }
  if (score >= 80) {
    return 'B';
  }
  if (score >= 70) {
    return 'C';
  }
  if (score >= 60) {
    return 'D';
  }
  return 'F';
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripAccents = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function collect(list, text) {
  const haystack = stripAccents(text.toLowerCase());
  return list.filter((word) =>
    new RegExp(`\\b${escapeRegExp(stripAccents(word).toLowerCase())}`, 'i').test(haystack),
  );
}

const countOccurrences = (text, word) => {
  const matches = text.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'));
  return matches ? matches.length : 0;
};

const bulletLines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => BULLET_RE.test(line));

const longParagraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .filter((block) => block.trim() && !BULLET_RE.test(block.trim()))
    .filter((block) => block.split(/\s+/).filter(Boolean).length > LONG_PARAGRAPH_WORDS);

export function evaluatePdfText(extraction, { lang = 'en', text: sourceText = '' } = {}) {
  const t = translations[lang] || translations.en;
  const text = extraction.text || '';
  const lower = text.toLowerCase();
  const flat = stripAccents(lower);
  const words = text.split(/\s+/).filter(Boolean);
  const checks = [];
  const suggestions = [];
  let score = 0;

  const add = (id, points, ok, title, msg, options = {}) => {
    const { fix, examples = [] } = options;
    checks.push({
      id,
      title,
      pass: ok,
      points: ok ? points : 0,
      max: points,
      msg,

      examples: ok ? [] : examples.filter(Boolean),
      ...(fix ? { fix } : {}),
    });
    if (ok) {
      score += points;
    } else {
      suggestions.push(msg);
    }
  };

  const charCount = extraction.charCount ?? text.replace(/\s+/g, ' ').trim().length;
  const pageCount = extraction.pageCount ?? 1;
  const wordCount = extraction.wordCount ?? words.length;

  const cvLang = detectCvLanguage(text) || lang;
  const isSpanish = cvLang === 'es';
  const verbLexicon = isSpanish ? SPANISH_VERBS : ENGLISH_VERBS;

  const hasText = charCount >= 200;
  add(
    'text',
    15,
    hasText,
    t.atsPdfTextLayer,
    hasText ? t.atsPdfTextLayerPass : t.atsPdfTextLayerFail,
    {
      examples: [`${charCount} ${t.atsPdfChars}.`, t.atsPdfTextLayerExample],
    },
  );

  const pageOk = pageCount >= 1 && pageCount <= 2;
  add(
    'pages',
    10,
    pageOk,
    t.atsPdfPageCount,
    pageOk ? `${pageCount} ${t.atsPdfPages}` : `${t.atsPdfPageCountFail} (${pageCount})`,
    {
      fix: pageCount > 2 ? { type: 'fit' } : undefined,
      examples: [`${pageCount} ${t.atsPdfPages}.`, t.atsPdfPageCountExample],
    },
  );

  const lengthOk = wordCount >= 200 && wordCount <= 900;
  add('length', 5, lengthOk, t.atsPdfLength, lengthOk ? t.atsPdfLengthPass : t.atsPdfLengthFail, {
    examples: [`${wordCount} ${t.atsPdfWords}.`, t.atsPdfLengthExample],
  });

  const contactFound = [EMAIL_RE.test(text), PHONE_RE.test(text), PROFILE_RE.test(text)];
  const contactOk = contactFound.filter(Boolean).length >= 2;
  add(
    'contact',
    10,
    contactOk,
    t.atsPdfContact,
    contactOk ? t.atsPdfContactPass : t.atsPdfContactFail,
    {
      fix: contactOk ? undefined : { type: 'insertContact' },
      examples: [
        `${t.exEmail}: ${contactFound[0] ? t.exFound : t.exMissing} (ana.gomez@mail.com)`,
        `${t.exPhone}: ${contactFound[1] ? t.exFound : t.exMissing} (+34 600 000 000)`,
        `${t.exProfile}: ${contactFound[2] ? t.exFound : t.exMissing} (linkedin.com/in/username)`,
      ],
    },
  );

  const expectedSections = SECTIONS[cvLang] || SECTIONS.en;
  const foundSections = expectedSections.filter((section) => section.re.test(flat));
  const sections = foundSections.length;
  add(
    'sections',
    10,
    sections >= 3,
    t.atsPdfSections,
    sections >= 3 ? t.atsPdfSectionsPass : t.atsPdfSectionsFail,
    {
      fix: sections >= 3 ? undefined : { type: 'insertSummary', lang: cvLang },
      examples: [
        `${t.exFound}: ${foundSections.map((section) => section.label).join(', ') || '-'}`,
        `${t.exMissing}: ${expectedSections
          .filter((section) => !section.re.test(flat))
          .map((section) => section.label)
          .join(', ')}`,
      ],
    },
  );

  const residue = RESIDUE_RE.exec(text);
  add(
    'residue',
    10,
    !residue,
    t.atsPdfResidue,
    residue ? `${t.atsPdfResidueFail} (${residue[0].trim()})` : t.atsPdfResiduePass,
    {
      examples: residue ? [`"${residue[0].trim()}"`, t.atsPdfResidueExample] : [],
    },
  );

  const verbs = collect(verbLexicon, flat);
  add(
    'verbs',
    15,
    verbs.length >= 4,
    t.atsPdfVerbs,
    verbs.length >= 4 ? t.atsPdfVerbsPass : t.atsPdfVerbsFail,
    {
      examples: [`${t.exFound}: ${verbs.slice(0, 6).join(', ') || '-'}`, t.atsPdfVerbsExample],
    },
  );

  const metrics = Array.from(new Set(text.match(METRIC_RE) || [])).slice(0, 10);
  add(
    'metrics',
    10,
    metrics.length >= 2,
    t.atsPdfMetrics,
    metrics.length >= 2 ? t.atsPdfMetricsPass : t.atsPdfMetricsFail,
    {
      examples: [`${t.exFound}: ${metrics.slice(0, 6).join(', ') || '-'}`, t.atsPdfMetricsExample],
    },
  );

  const keywords = collect(isSpanish ? ATS_KEYWORDS_ES : ATS_KEYWORDS, flat);
  const role = detectRole(flat);
  const roleKeywords = (ROLE_KEYWORDS[cvLang] || ROLE_KEYWORDS.en)[role] || [];
  const missingRoleKeywords = roleKeywords.filter((keyword) => !collect([keyword], flat).length);
  add(
    'keywords',
    5,
    keywords.length >= 4,
    t.atsPdfKeywords,
    keywords.length >= 4 ? t.atsPdfKeywordsPass : t.atsPdfKeywordsFail,
    {
      examples: [
        `${t.exFound}: ${keywords.slice(0, 8).join(', ') || '-'}`,
        missingRoleKeywords.length > 0
          ? `${t.exAddForRole} ${role}: ${missingRoleKeywords.slice(0, 6).join(', ')}`
          : t.atsPdfKeywordsExample,
      ],
    },
  );

  const bySection = splitIntoSections(text);
  const experienceBullets = bulletLines((bySection.experience || []).join('\n'));
  const emptyBullets = experienceBullets.filter((line) => {
    const hasMetric = METRIC_RE.test(line);
    METRIC_RE.lastIndex = 0;
    const [, firstWord] = VERB_AT_START_RE.exec(line) || [];
    const hasVerb = firstWord ? collect(verbLexicon, firstWord).length > 0 : false;
    return !hasMetric && !hasVerb;
  });
  const bulletOk =
    experienceBullets.length === 0 || emptyBullets.length / experienceBullets.length <= 0.3;
  add(
    'bullets',
    5,
    bulletOk,
    t.atsPdfBullets,
    bulletOk
      ? t.atsPdfBulletsPass
      : `${t.atsPdfBulletsFail} (${emptyBullets.length}/${experienceBullets.length})`,
    {
      examples: [
        ...emptyBullets.slice(0, 3).map((line) => `"${line.replace(/^[•\-*]\s*/, '')}"`),
        t.atsPdfBulletsExample,
      ],
    },
  );

  const wordsPerPage = pageCount > 0 ? Math.round(wordCount / pageCount) : wordCount;
  const densityOk = wordsPerPage <= DENSE_WORDS_PER_PAGE;
  const paragraphs = longParagraphs(text);
  add(
    'density',
    3,
    densityOk,
    t.atsPdfDensity,
    densityOk ? t.atsPdfDensityPass : `${t.atsPdfDensityFail} (${wordsPerPage})`,
    {
      examples: [
        `${wordsPerPage} ${t.atsPdfWords} ${t.atsPdfPerPage}.`,
        t.atsPdfDensityExample,
        ...paragraphs
          .slice(0, 1)
          .map((block) => `"${block.trim().split(/\s+/).slice(0, 12).join(' ')}..."`),
      ],
    },
  );

  const stuffed = keywords.filter(
    (keyword) => countOccurrences(flat, stripAccents(keyword.toLowerCase())) > STUFFING_REPEAT,
  );
  const stuffingDensity = words.length > 0 ? keywords.length / words.length : 0;
  const stuffingOk = stuffed.length === 0 && stuffingDensity <= STUFFING_DENSITY;
  add(
    'stuffing',
    2,
    stuffingOk,
    t.atsPdfStuffing,
    stuffingOk
      ? t.atsPdfStuffingPass
      : stuffed.length > 0
        ? `${t.atsPdfStuffingFail} (${stuffed.join(', ')})`
        : t.atsPdfStuffingFail,
    {
      examples: [
        ...stuffed
          .slice(0, 4)
          .map(
            (keyword) =>
              `"${keyword}" x${countOccurrences(flat, stripAccents(keyword.toLowerCase()))}`,
          ),
        t.atsPdfStuffingExample,
      ],
    },
  );

  const found = {
    verbs,
    metrics,
    keywords,
    role,
    roleKeywords,
    sections,
    sectionLabels: foundSections.map((section) => section.label),
    missingSections: expectedSections
      .filter((section) => !section.re.test(flat))
      .map((section) => section.label),
    contact: { email: contactFound[0], phone: contactFound[1], profile: contactFound[2] },
    bullets: experienceBullets.length,
    emptyBullets: emptyBullets.length,
    emptyBulletSamples: emptyBullets.slice(0, 3),
    stuffed,
    wordsPerPage,
    paragraphs: paragraphs.length,
    residue: residue ? residue[0].trim() : null,
  };

  return {
    score: Math.round(score),
    grade: grade(Math.round(score)),
    checks,
    suggestions,
    found,
    lang,
    cvLang,
    pageCount,
    charCount,
    wordCount,
    text: text.slice(0, MAX_STORED_TEXT),

    pageTexts: (extraction.pages || []).map((page) =>
      (page.lines || []).join('\n').slice(0, MAX_STORED_PAGE_TEXT),
    ),
    sourceHash: hashMarkdown(sourceText || text),
  };
}

export async function evaluatePdf(markdown, styles, options = {}) {
  const lang = options.lang || 'en';
  const artifact = getPdfArtifact(markdown, styles, options);
  const extraction = await extractPdfText(await artifact.blob.arrayBuffer(), options.deps);
  const result = evaluatePdfText(
    { ...extraction, pageCount: extraction.pageCount || artifact.pages },
    { lang, text: markdown },
  );
  return {
    ...result,
    lang,
    artifactKey: artifact.key,
    styles: {
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      fontFamily: styles.fontFamily,
    },
    bytes: artifact.bytes,
    createdAt: new Date().toISOString(),
    pdf: artifact.blob,
  };
}
