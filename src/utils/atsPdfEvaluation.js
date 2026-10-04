import { translations } from '../data/translations';
import { extractPdfText } from './pdfText';
import { getPdfArtifact } from './pdfArtifact';
import { hashMarkdown } from './atsPdfHistory';
import { listSections } from './markdownSections';
import { exportFilename } from './exportName';
import {
  ATS_KEYWORDS,
  ATS_KEYWORDS_ES,
  ENGLISH_VERBS,
  SPANISH_VERBS,
  WEAK_PHRASES,
  PHRASE_REWRITES,
} from './atsScorer';

export const CHECK_POINTS = {
  text: 10,
  pages: 8,
  length: 3,
  contact: 9,
  sections: 9,
  headings: 4,
  residue: 6,
  emoji: 3,
  verbs: 10,
  metrics: 8,
  phrasing: 5,
  duplicates: 3,
  keywords: 5,
  bullets: 4,
  language: 2,
  dates: 4,
  filename: 2,
  density: 3,
  stuffing: 2,
};

export const TOTAL_POINTS = Object.values(CHECK_POINTS).reduce((a, b) => a + b, 0);

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
    devops: ['ci/cd', 'kubernetes', 'terraform', 'monitorización', 'automatización', 'fiabilidad'],
    data: ['sql', 'tableau', 'etl', 'dashboards', 'python', 'analítica'],
    ml: ['machine learning', 'python', 'mlops', 'llm', 'datos', 'pipelines'],
    qa: ['automatización de pruebas', 'testing', 'regresión', 'ci/cd', 'calidad'],
    mobile: ['android', 'ios', 'react native', 'testing', 'rendimiento'],
    product: ['roadmap', 'stakeholders', 'agil', 'métricas', 'priorización'],
    sales: ['crm', 'pipeline', 'negociación', 'cuota', 'prospección'],
    marketing: ['seo', 'campaña', 'analítica', 'contenidos', 'conversión'],
    design: ['ux', 'figma', 'prototipado', 'accesibilidad', 'investigación'],
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
  let best = null;
  let bestHits = 0;
  for (const candidate of ROLE_MARKERS) {
    const hits = (flat.match(new RegExp(candidate.re.source, 'gi')) || []).length;
    if (hits > bestHits) {
      best = candidate.role;
      bestHits = hits;
    }
  }
  return best;
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

export function detectCvLanguage(text, { minWords = 15 } = {}) {
  const flat = stripAccents(String(text || '').toLowerCase());
  if (flat.split(/\s+/).filter(Boolean).length < minWords) {
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

const MONTH_NUMBERS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  ene: 1,
  abr: 4,
  ago: 8,
  dic: 12,
};
const MONTH_WORD = `(?:${Object.keys(MONTH_NUMBERS).join('|')})[a-z\\u00E0-\\u00FF]*\\.?`;
const OPEN_WORD = '(?:present|actualidad|presente|now|hoy|current|actual)';
const SEPARATOR = /^\s*(?:[-–—/|]|\bto\b|\ba\b|hasta|al)\s*$/i;
const OPEN_TAIL = new RegExp(`^\\s*(?:[-–—/|]\\s*)?${OPEN_WORD}\\b`, 'i');

const tokenAt = (year, month = 0) => year * 12 + month;
const tokenRe = new RegExp(
  `(${MONTH_WORD})\\s+((?:19|20)\\d{2})|\\b(\\d{1,2})\\/((?:19|20)\\d{2})\\b|\\b((?:19|20)\\d{2})\\b`,
  'gi',
);

const monthNumber = (word) =>
  MONTH_NUMBERS[stripAccents(String(word).toLowerCase()).slice(0, 3)] || 0;

function dateTokens(text) {
  const source = String(text || '');
  const tokens = [];
  tokenRe.lastIndex = 0;
  let match = tokenRe.exec(source);
  while (match) {
    const [, monthName, monthYear, numericMonth, numericYear, plainYear] = match;
    if (monthName) {
      tokens.push({
        at: tokenAt(Number(monthYear), monthNumber(monthName)),
        year: Number(monthYear),
        raw: match[0].trim(),
        style: 'names',
        start: match.index,
        end: match.index + match[0].length,
      });
    } else if (numericMonth) {
      tokens.push({
        at: tokenAt(Number(numericYear), Number(numericMonth)),
        year: Number(numericYear),
        raw: match[0].trim(),
        style: 'numeric',
        start: match.index,
        end: match.index + match[0].length,
      });
    } else if (plainYear) {
      tokens.push({
        at: tokenAt(Number(plainYear)),
        year: Number(plainYear),
        raw: match[0].trim(),
        style: 'years',
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    match = tokenRe.exec(source);
  }
  return tokens;
}

const CURRENT_YEAR = new Date().getFullYear();

const uniqueMatches = (text, pattern) => {
  pattern.lastIndex = 0;
  return [...new Set((String(text || '').match(pattern) || []).map((hit) => hit.trim()))];
};

export function analyseDates(text, { now = CURRENT_YEAR } = {}) {
  const source = String(text || '');
  const tokens = dateTokens(source);
  const ranges = [];
  const sourceStyles = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    const from = tokens[index];
    const gap = source.slice(
      from.end,
      index + 1 < tokens.length ? tokens[index + 1].start : source.length,
    );
    const openTail = OPEN_TAIL.test(gap);
    const next = tokens[index + 1];

    if (next && SEPARATOR.test(gap)) {
      ranges.push({ from: from.at, to: next.at, open: false, raw: `${from.raw} - ${next.raw}` });
      sourceStyles.add(from.style);
      sourceStyles.add(next.style);
      index += 1;
      continue;
    }
    if (openTail) {
      ranges.push({
        from: from.at,
        to: tokenAt(now, 11),
        open: true,
        raw: `${from.raw} - Present`,
      });
      sourceStyles.add(from.style);
    }
  }

  const future = ranges.filter((range) => range.to > tokenAt(now, 11));

  const styles = [...new Set([...sourceStyles].filter((style) => style !== 'years'))];
  const overlaps = [];
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      const a = ranges[i];
      const b = ranges[j];
      if (Math.min(a.to, b.to) - Math.max(a.from, b.from) >= 0) {
        overlaps.push(`${a.raw} / ${b.raw}`);
      }
    }
  }

  return {
    count: ranges.length,
    ranges,
    future,
    styles,
    mixedStyles: styles.length > 1,
    overlaps,
  };
}

const normaliseBullet = (line) =>
  stripAccents(line.toLowerCase())
    .replace(BULLET_RE, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function findDuplicateBullets(bullets) {
  const seen = new Map();
  for (const line of bullets) {
    const key = normaliseBullet(line);
    if (key.split(' ').filter(Boolean).length < 4) {
      continue;
    }
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ text: key, count }))
    .sort((a, b) => b.count - a.count);
}

export function findWeakPhrases(text) {
  const flat = stripAccents(String(text || '').toLowerCase());
  const found = new Map();
  for (const lang of ['en', 'es']) {
    const rewrites = PHRASE_REWRITES[lang] || {};
    for (const phrase of WEAK_PHRASES[lang]) {
      const needle = stripAccents(phrase.toLowerCase());
      const hits = flat.split(needle).length - 1;
      if (hits <= 0) {
        continue;
      }
      const entry = found.get(phrase);
      if (entry) {
        entry.count += hits;
        continue;
      }
      found.set(phrase, { phrase, count: hits, rewrite: rewrites[phrase] || null });
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count);
}

const EXOTIC_RE =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/u;
const NO_TEXT_PLACEHOLDER = /\[(?:contenido no textual|no textual content)\]/gi;

export function findExoticCharacters(text) {
  const source = String(text || '');
  const symbols = [];
  for (const char of source) {
    if (EXOTIC_RE.test(char) && !symbols.includes(char)) {
      symbols.push(char);
      if (symbols.length === 6) {
        break;
      }
    }
  }
  const placeholders = uniqueMatches(source, NO_TEXT_PLACEHOLDER);
  return { symbols, placeholders, total: symbols.length + placeholders.length };
}

const FILENAME_NOISE = new Set([
  'final',
  'final2',
  'version',
  'copy',
  'new',
  'nuevo',
  'copia',
  'updated',
  'rev',
  'draft',
  'borrador',
  'ultima',
  'última',
]);

export function analyseFilename(markdown) {
  const name = exportFilename(markdown, 'pdf');
  const withoutExt = name.replace(/\.pdf$/i, '');
  const person = String(markdown || '').match(/^#{1,6}\s+(.+)$/m);
  const who = stripAccents(String(person ? person[1] : '').toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  const problems = [];
  if (/\s/.test(name)) {
    problems.push('spaces');
  }

  const tokens = withoutExt.split(/[_.-]+/).filter(Boolean);
  if (tokens.some((token) => FILENAME_NOISE.has(token) || /^v\d+$/.test(token))) {
    problems.push('version-marker');
  }
  if (!/\d{4}-\d{2}-\d{2}$/.test(withoutExt)) {
    problems.push('no-date');
  }
  if (!who || !withoutExt.toLowerCase().includes(who.split('_')[0])) {
    problems.push('no-name');
  }
  return { name, problems };
}

const MAX_HEADING_CHARS = 32;
const MAX_LONG_HEADING_CHARS = 60;

const ALL_SECTIONS = SECTIONS.en.concat(SECTIONS.es);

function isHeadingLine(raw) {
  const line = String(raw || '').trim();
  if (!line || BULLET_RE.test(line)) {
    return false;
  }
  const clean = line.replace(/^#{1,6}\s*/, '').trim();
  if (!clean || /[.,;:!?]$/.test(clean)) {
    return false;
  }
  const letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 3) {
    return false;
  }
  const words = clean.split(/\s+/);
  const allCaps = letters === letters.toUpperCase();
  const isMarkdownHeading = /^#{1,6}\s/.test(line);
  const isOneWord = words.length === 1;

  const opensWithSection =
    clean.length > MAX_HEADING_CHARS &&
    clean.length <= MAX_LONG_HEADING_CHARS &&
    ALL_SECTIONS.some((section) => section.re.test(words[0]));
  return allCaps || isMarkdownHeading || isOneWord || opensWithSection;
}

export function splitIntoSections(text) {
  const sections = { intro: [] };
  let current = 'intro';
  for (const raw of String(text || '').split('\n')) {
    const match = isHeadingLine(raw) ? ALL_SECTIONS.find((section) => section.re.test(raw)) : null;
    if (match) {
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
const STUFFING_MIN_COUNT = 6;
const STUFFING_MIN_DENSITY = 0.06;
const STUFFING_IN_LINE = 4;
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
    new RegExp(`\\b${escapeRegExp(stripAccents(word).toLowerCase())}\\b`, 'i').test(haystack),
  );
}

const metricMatches = (text) => String(text || '').match(new RegExp(METRIC_RE.source, 'gi')) || [];
const hasMetric = (text) => metricMatches(text).length > 0;

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'over',
  'under',
  'per',
  'our',
  'out',
  'all',
  'any',
  'but',
  'not',
  'you',
  'are',
  'was',
  'were',
  'has',
  'had',
  'his',
  'her',
  'its',
  'their',
  'they',
  'them',
  'she',
  'him',
  'who',
  'what',
  'when',
  'which',
  'while',
  'been',
  'being',
  'also',
  'more',
  'most',
  'other',
  'than',
  'then',
  'these',
  'those',
  'such',
  'only',
  'own',
  'same',
  'too',
  'very',
  'can',
  'will',
  'just',
  'about',
  'after',
  'before',
  'between',
  'both',
  'each',
  'few',
  'more',
  'other',
  'some',
  'through',
  'where',
  'while',
  'years',
  'year',
  'across',
  'using',
  'used',
  'use',
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'y',
  'o',
  'en',
  'con',
  'para',
  'por',
  'que',
  'se',
  'su',
  'sus',
  'al',
  'es',
  'son',
  'fue',
  'como',
  'más',
  'pero',
  'sobre',
  'entre',
  'desde',
  'hasta',
  'año',
  'años',
  'usando',
  'usó',
]);

const termsOf = (line) =>
  stripAccents(String(line || '').toLowerCase())
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .map((term) => term.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term) && !/^\d+$/.test(term));

const repeatedTerms = (text, wordCount) => {
  const counts = new Map();
  const perLine = new Map();

  for (const term of termsOf(text)) {
    counts.set(term, (counts.get(term) || 0) + 1);
  }
  for (const line of String(text || '').split('\n')) {
    const seen = new Map();
    for (const term of termsOf(line)) {
      seen.set(term, (seen.get(term) || 0) + 1);
    }
    for (const [term, hits] of seen) {
      perLine.set(term, Math.max(perLine.get(term) || 0, hits));
    }
  }

  const total = wordCount > 0 ? wordCount : [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .map(([term, count]) => ({
      term,
      count,
      share: count / total,
      inLine: perLine.get(term) || 0,
    }))
    .filter(
      (entry) =>
        entry.inLine >= STUFFING_IN_LINE ||
        (entry.count >= STUFFING_MIN_COUNT && entry.share >= STUFFING_MIN_DENSITY),
    )
    .sort((a, b) => b.inLine - a.inLine || b.count - a.count);
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

  const add = (id, ok, title, msg, options = {}) => {
    const points = CHECK_POINTS[id];
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
  const verbLexicon = [...ENGLISH_VERBS, ...SPANISH_VERBS];
  const keywordLexicon = [...ATS_KEYWORDS, ...ATS_KEYWORDS_ES];

  const hasText = charCount >= 200;
  add('text', hasText, t.atsPdfTextLayer, hasText ? t.atsPdfTextLayerPass : t.atsPdfTextLayerFail, {
    examples: [`${charCount} ${t.atsPdfChars}.`, t.atsPdfTextLayerExample],
  });

  const pageOk = pageCount >= 1 && pageCount <= 2;
  add(
    'pages',
    pageOk,
    t.atsPdfPageCount,
    pageOk ? `${pageCount} ${t.atsPdfPages}` : `${t.atsPdfPageCountFail} (${pageCount})`,
    {
      fix: pageCount > 2 ? { type: 'fit' } : undefined,
      examples: [`${pageCount} ${t.atsPdfPages}.`, t.atsPdfPageCountExample],
    },
  );

  const lengthOk = wordCount >= 200 && wordCount <= 900;
  add('length', lengthOk, t.atsPdfLength, lengthOk ? t.atsPdfLengthPass : t.atsPdfLengthFail, {
    examples: [`${wordCount} ${t.atsPdfWords}.`, t.atsPdfLengthExample],
  });

  const contactFound = [EMAIL_RE.test(text), PHONE_RE.test(text), PROFILE_RE.test(text)];
  const contactOk = contactFound.filter(Boolean).length >= 2;
  add(
    'contact',
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

  const bySection = splitIntoSections(text);
  const sectionKeys = new Set(Object.keys(bySection).filter((key) => key !== 'intro'));
  const expectedSections = SECTIONS[cvLang] || SECTIONS.en;
  const foundSections = expectedSections.filter((section) => sectionKeys.has(section.key));
  const missingSections = expectedSections.filter((section) => !sectionKeys.has(section.key));
  const sections = foundSections.length;
  add(
    'sections',
    sections >= 3,
    t.atsPdfSections,
    sections >= 3 ? t.atsPdfSectionsPass : t.atsPdfSectionsFail,
    {
      fix: sections >= 3 ? undefined : { type: 'insertSummary', lang: cvLang },
      examples: [
        `${t.exFound}: ${foundSections.map((section) => section.label).join(', ') || '-'}`,
        `${t.exMissing}: ${missingSections.map((section) => section.label).join(', ')}`,
      ],
    },
  );

  const judgeable = charCount >= 200;

  const sourceHeadings = listSections(sourceText).map((section) => section.title);
  const sheetHeadings = new Set(
    String(text || '')
      .split('\n')
      .filter((line) => isHeadingLine(line))
      .map((line) =>
        stripAccents(line.replace(/^#{1,6}\s*/, '').toLowerCase())
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .trim(),
      ),
  );
  const lostHeadings = sourceHeadings.filter((title) => {
    const words = stripAccents(String(title || '').toLowerCase())
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 0) {
      return false;
    }

    const kept = Math.max(
      0,
      ...[...sheetHeadings].map(
        (heading) => words.filter((word) => heading.includes(word)).length / words.length,
      ),
    );
    return kept < 0.85;
  });
  add(
    'headings',
    judgeable && lostHeadings.length === 0,
    t.atsPdfHeadings,
    lostHeadings.length === 0 ? t.atsPdfHeadingsPass : t.atsPdfHeadingsFail,
    {
      examples: [
        `${sourceHeadings.length - lostHeadings.length}/${sourceHeadings.length} ${t.atsPdfHeadingsSeen}.`,
        ...lostHeadings.slice(0, 4).map((title) => `"${title}"`),
        t.atsPdfHeadingsExample,
      ],
    },
  );

  const residue = RESIDUE_RE.exec(text);
  add(
    'residue',
    !residue,
    t.atsPdfResidue,
    residue ? `${t.atsPdfResidueFail} (${residue[0].trim()})` : t.atsPdfResiduePass,
    {
      examples: residue ? [`"${residue[0].trim()}"`, t.atsPdfResidueExample] : [],
    },
  );

  const exotic = findExoticCharacters(text);
  add(
    'emoji',
    exotic.total === 0,
    t.atsPdfEmoji,
    exotic.total === 0 ? t.atsPdfEmojiPass : `${t.atsPdfEmojiFail} (${exotic.total})`,
    {
      examples: [
        ...exotic.symbols.map((symbol) => `"${symbol}"`),
        ...exotic.placeholders.map((value) => `"${value}"`),
        t.atsPdfEmojiExample,
      ],
    },
  );

  const dates = analyseDates((bySection.experience || []).join('\n') || text);
  const dateProblems = [
    ...(dates.future.length ? [t.atsPdfDatesFuture] : []),
    ...(dates.mixedStyles ? [t.atsPdfDatesMixed] : []),
    ...(dates.overlaps.length ? [t.atsPdfDatesOverlap] : []),
  ];
  add(
    'dates',
    judgeable && dateProblems.length === 0,
    t.atsPdfDates,
    dateProblems.length === 0 ? t.atsPdfDatesPass : dateProblems.join(' '),
    {
      examples: [
        `${dates.count} ${t.atsPdfDatesFound}.`,
        ...dates.future.map((range) => `${t.atsPdfDatesFuture}: "${range.raw}"`),
        ...(dates.styles.length > 1 ? [`${t.atsPdfDatesMixed}: ${dates.styles.join(' + ')}`] : []),
        ...dates.overlaps.slice(0, 3).map((pair) => `${t.atsPdfDatesOverlap}: ${pair}`),
        t.atsPdfDatesExample,
      ],
    },
  );

  const filename = sourceText ? analyseFilename(sourceText) : { name: '', problems: [] };
  add(
    'filename',
    filename.problems.length === 0,
    t.atsPdfFilename,
    filename.problems.length === 0
      ? filename.name
        ? `${t.atsPdfFilenamePass} (${filename.name})`
        : t.atsPdfFilenamePass
      : `${t.atsPdfFilenameFail} (${filename.name})`,
    {
      examples: [
        filename.name,
        ...filename.problems.map((problem) => `${t.atsPdfFilenameProblem}: ${problem}`),
        t.atsPdfFilenameExample,
      ].filter(Boolean),
    },
  );

  const verbs = collect(verbLexicon, flat);
  add(
    'verbs',
    verbs.length >= 4,
    t.atsPdfVerbs,
    verbs.length >= 4 ? t.atsPdfVerbsPass : t.atsPdfVerbsFail,
    {
      examples: [`${t.exFound}: ${verbs.slice(0, 6).join(', ') || '-'}`, t.atsPdfVerbsExample],
    },
  );

  const metrics = Array.from(new Set(metricMatches(text))).slice(0, 10);
  add(
    'metrics',
    metrics.length >= 2,
    t.atsPdfMetrics,
    metrics.length >= 2 ? t.atsPdfMetricsPass : t.atsPdfMetricsFail,
    {
      examples: [`${t.exFound}: ${metrics.slice(0, 6).join(', ') || '-'}`, t.atsPdfMetricsExample],
    },
  );

  const role = detectRole(flat);
  const roleKeywords = (ROLE_KEYWORDS[cvLang] || ROLE_KEYWORDS.en)[role] || [];
  const missingRoleKeywords = roleKeywords.filter((keyword) => !collect([keyword], flat).length);
  const keywords = collect([...keywordLexicon, ...roleKeywords], flat);
  add(
    'keywords',
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

  const experienceBullets = bulletLines((bySection.experience || []).join('\n'));
  const emptyBullets = experienceBullets.filter((line) => {
    const [, firstWord] = VERB_AT_START_RE.exec(line) || [];
    const hasVerb = firstWord ? collect(verbLexicon, firstWord).length > 0 : false;
    return !hasMetric(line) && !hasVerb;
  });
  const bulletOk =
    experienceBullets.length === 0 || emptyBullets.length / experienceBullets.length <= 0.3;
  add(
    'bullets',
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

  const weak = findWeakPhrases(experienceBullets.length > 0 ? experienceBullets.join('\n') : text);
  const weakTotal = weak.reduce((total, entry) => total + entry.count, 0);
  const phrasingOk =
    experienceBullets.length === 0 ? weakTotal === 0 : weakTotal / experienceBullets.length <= 0.34;
  add(
    'phrasing',
    judgeable && phrasingOk,
    t.atsPdfPhrasing,
    phrasingOk ? t.atsPdfPhrasingPass : `${t.atsPdfPhrasingFail} (${weakTotal})`,
    {
      examples: [
        ...weak
          .slice(0, 4)
          .map(
            (entry) =>
              `"${entry.phrase}" x${entry.count}${entry.rewrite ? ` -> ${entry.rewrite}` : ''}`,
          ),
        t.atsPdfPhrasingExample,
      ],
    },
  );

  const duplicates = findDuplicateBullets(experienceBullets);
  add(
    'duplicates',
    judgeable && duplicates.length === 0,
    t.atsPdfDuplicates,
    duplicates.length === 0
      ? t.atsPdfDuplicatesPass
      : `${t.atsPdfDuplicatesFail} (${duplicates.length})`,
    {
      examples: [
        ...duplicates.slice(0, 3).map((entry) => `"${entry.text.slice(0, 70)}..." x${entry.count}`),
        t.atsPdfDuplicatesExample,
      ],
    },
  );

  const headingLang = detectCvLanguage([...sheetHeadings].join(' '), { minWords: 3 });
  const bulletLang = detectCvLanguage(experienceBullets.join(' '), { minWords: 8 });
  const mixed = Boolean(headingLang && bulletLang && headingLang !== bulletLang);
  add(
    'language',
    judgeable && !mixed,
    t.atsPdfLanguage,
    mixed
      ? t.atsPdfLanguageFail
          .replace('{a}', headingLang === 'es' ? t.atsPdfLanguageSpanish : t.atsPdfLanguageEnglish)
          .replace('{b}', bulletLang === 'es' ? t.atsPdfLanguageSpanish : t.atsPdfLanguageEnglish)
      : t.atsPdfLanguagePass,
    {
      examples: [
        `${t.atsPdfLanguageHeadings}: ${headingLang || '-'}. ${t.atsPdfLanguageBullets}: ${
          bulletLang || '-'
        }.`,
        t.atsPdfLanguageExample,
      ],
    },
  );

  const pageWords = (extraction.pages || [])
    .map((page) => (page.lines || []).join('\n').split(/\s+/).filter(Boolean).length)
    .filter((count) => count > 0);
  const densest = pageWords.length ? Math.max(...pageWords) : 0;
  const densestPage = densest ? pageWords.indexOf(densest) + 1 : 0;
  const wordsPerPage = densest || (pageCount > 0 ? Math.round(wordCount / pageCount) : wordCount);
  const densityOk = wordsPerPage <= DENSE_WORDS_PER_PAGE;
  const paragraphs = longParagraphs(text);
  add(
    'density',
    densityOk,
    t.atsPdfDensity,
    densityOk ? t.atsPdfDensityPass : `${t.atsPdfDensityFail} (${wordsPerPage})`,
    {
      examples: [
        densestPage
          ? `${wordsPerPage} ${t.atsPdfWords} ${t.atsPdfPerPage} (${t.atsPdfPage} ${densestPage}).`
          : `${wordsPerPage} ${t.atsPdfWords} ${t.atsPdfPerPage}.`,
        t.atsPdfDensityExample,
        ...paragraphs
          .slice(0, 1)
          .map((block) => `"${block.trim().split(/\s+/).slice(0, 12).join(' ')}..."`),
      ],
    },
  );

  const stuffed = repeatedTerms(text, words.length);
  const stuffingOk = stuffed.length === 0;
  add(
    'stuffing',
    stuffingOk,
    t.atsPdfStuffing,
    stuffingOk
      ? t.atsPdfStuffingPass
      : `${t.atsPdfStuffingFail} (${stuffed.map((entry) => `${entry.term} x${entry.count}`).join(', ')})`,
    {
      examples: [
        ...stuffed
          .slice(0, 4)
          .map((entry) => `"${entry.term}" x${entry.count} (${Math.round(entry.share * 100)}%)`),
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
    missingSections: missingSections.map((section) => section.label),
    contact: { email: contactFound[0], phone: contactFound[1], profile: contactFound[2] },
    bullets: experienceBullets.length,
    emptyBullets: emptyBullets.length,
    emptyBulletSamples: emptyBullets.slice(0, 3),
    stuffed,
    wordsPerPage,
    densestPage,
    paragraphs: paragraphs.length,
    residue: residue ? residue[0].trim() : null,
    lostHeadings,
    exotic,
    dates,
    weakPhrases: weak,
    duplicates,
    languages: { headings: headingLang, bullets: bulletLang },
    filename,
  };

  const gaps = checks
    .filter((check) => !check.pass)
    .map((check) => ({
      id: check.id,
      title: check.title,
      lost: check.max - check.points,
      msg: check.msg,
      fix: check.fix || null,
    }))
    .sort((a, b) => b.lost - a.lost);

  return {
    score: Math.round(score),
    grade: grade(Math.round(score)),
    maxScore: TOTAL_POINTS,
    checks,
    suggestions,
    gaps,
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

export async function evaluatePdfFile(file, options = {}) {
  const lang = options.lang || 'en';
  const t = translations[lang] || translations.en;
  const buffer = await file.arrayBuffer();
  const extraction = await extractPdfText(buffer, options.deps);
  if ((extraction.charCount ?? 0) < 50) {
    throw new Error(t.atsPdfNoTextLayer);
  }
  const result = evaluatePdfText(extraction, { lang, text: options.sourceMarkdown || '' });
  return {
    ...result,
    lang,
    imported: true,
    fileName: file.name || '',
    bytes: file.size || 0,
    artifactKey: `import:${hashMarkdown(`${file.name || ''}:${extraction.text.length}`)}`,
    createdAt: new Date().toISOString(),
  };
}

export async function evaluatePdf(markdown, styles, options = {}) {
  const lang = options.lang || 'en';
  const t = translations[lang] || translations.en;
  const artifact = getPdfArtifact(markdown, styles, options);
  const extraction = await extractPdfText(await artifact.blob.arrayBuffer(), options.deps);
  if ((extraction.charCount ?? 0) < 50) {
    throw new Error(t.atsPdfNoTextLayer);
  }
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
