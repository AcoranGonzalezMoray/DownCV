const SECTION_ALIASES = {
  summary: [
    'summary',
    'professional summary',
    'profile',
    'about',
    'about me',
    'objective',
    'personal profile',
    'resumen',
    'resumen profesional',
    'perfil',
    'perfil profesional',
    'sobre mi',
    'objetivo',
    'acerca de',
  ],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment',
    'employment history',
    'career',
    'work history',
    'experiencia',
    'experiencia profesional',
    'experiencia laboral',
    'trayectoria',
    'trayectoria profesional',
    'empleo',
    'trabajo',
  ],
  education: [
    'education',
    'academic background',
    'academic',
    'studies',
    'degree',
    'formacion',
    'formación',
    'formacion academica',
    'formación académica',
    'estudios',
    'educacion',
    'educación',
    'titulacion',
    'titulación',
  ],
  skills: [
    'skills',
    'technical skills',
    'core skills',
    'competences',
    'competencies',
    'technologies',
    'tech stack',
    'habilidades',
    'habilidades tecnicas',
    'habilidades técnicas',
    'competencias',
    'conocimientos',
    'tecnologias',
    'tecnologías',
    'herramientas',
  ],
  projects: [
    'projects',
    'personal projects',
    'side projects',
    'portfolio',
    'proyectos',
    'proyectos personales',
    'proyectos destacados',
  ],
  certifications: [
    'certifications',
    'certificates',
    'courses',
    'training',
    'certificaciones',
    'certificados',
    'cursos',
    'formacion complementaria',
    'formación complementaria',
  ],
  languages: ['languages', 'idiomas', 'lenguas', 'idiomas y niveles'],
  experience_extra: [
    'awards',
    'achievements',
    'publications',
    'volunteering',
    'awards and achievements',
    'premios',
    'logros',
    'reconocimientos',
    'publicaciones',
    'voluntariado',
  ],
  interests: ['interests', 'hobbies', 'intereses', 'aficiones'],
  references: ['references', 'referencias'],
};

const SECTION_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'experience_extra',
  'interests',
  'references',
];

const ALIAS_LOOKUP = (() => {
  const lookup = new Map();
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      lookup.set(normalizeWord(alias), key);
    }
  }
  return lookup;
})();

function normalizeWord(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}\b/;
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>()[\]"']+|\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|medium\.com|dev\.to|stackoverflow\.com)\/[^\s<>()[\]"']*/i;

const NAME_RE = /^[\p{Lu}][\p{L}'’-]+(?: [\p{Lu}][\p{L}'’.-]+){1,3}$/u;

const DATES_RE =
  /((?:19|20)\d{2})\s*(?:[-–—/]|to|a|hasta)\s*((?:19|20)\d{2}|present|actualidad|now|hoy|current)/i;
const BULLET_GLYPH_RE = /^[\s•·▪◦‣∙*\-–—o]\s*/;

const has = (value) => /\S/.test(value || '');

function toLines(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''));
}

function isNoise(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  if (/^[\s_\-=*.·•]{3,}$/.test(trimmed)) {
    return true;
  }

  const flat = normalizeWord(trimmed);
  if (/^(?:page|pagina)\s*\d+/.test(flat)) {
    return true;
  }
  if (/^\d+(?:\s*(?:of|de)\s*\d+)?$/.test(flat)) {
    return true;
  }
  return false;
}

const stripMarkdown = (line) =>
  String(line || '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^[*_~]{1,2}([^*_~]+)[*_~]{1,2}\s*$/, '$1');

export function detectSection(line) {
  const cleaned = normalizeWord(line)
    .replace(/^[#*\s•·-]+/, '')
    .replace(/[:#*\s]+$/, '');
  if (!cleaned || cleaned.length > 40) {
    return null;
  }
  return ALIAS_LOOKUP.get(cleaned) || null;
}

function contactOf(line) {
  const email = (line.match(EMAIL_RE) || [])[0] || null;
  const url = (line.match(URL_RE) || [])[0] || null;

  const withoutLinks = line.replace(URL_RE, ' ').replace(EMAIL_RE, ' ');
  const phone = (withoutLinks.match(PHONE_RE) || [])[0]?.trim() || null;
  return { email, phone, url };
}

const isContactLine = (line) => {
  const { email, phone, url } = contactOf(line);
  return Boolean(email || url) || (phone && !/^\d{1,2}$/.test(phone));
};

function entryLine(line) {
  const cleaned = line
    .replace(/^#{1,6}\s*/, '')
    .replace(BULLET_GLYPH_RE, '')
    .trim();
  if (!cleaned || cleaned.length > 120) {
    return null;
  }
  const dates = cleaned.match(DATES_RE);
  if (!dates) {
    return null;
  }
  const head = cleaned
    .slice(0, dates.index)
    .replace(/[|,\-–—(\s]+$/, '')
    .trim();
  if (!head) {
    return null;
  }
  return `### ${head} | ${dates[1]} - ${dates[2]}`;
}

function linkify(text) {
  return text
    .replace(URL_RE, (match) => {
      const href = /^https?:/i.test(match) ? match : `https://${match}`;
      return `[${match}](${href})`;
    })
    .replace(
      /(?<![\w.])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)(?!\S*\])/g,
      (match, email) => `[${email}](mailto:${email})`,
    );
}

function paragraphOf(lines) {
  const text = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
  return has(text) ? linkify(text) : null;
}

const SECTION_TITLES = {
  summary: { en: 'PROFESSIONAL SUMMARY', es: 'RESUMEN PROFESIONAL' },
  experience: { en: 'EXPERIENCE', es: 'EXPERIENCIA' },
  education: { en: 'EDUCATION', es: 'EDUCACIÓN' },
  skills: { en: 'SKILLS', es: 'HABILIDADES' },
  projects: { en: 'PROJECTS', es: 'PROYECTOS' },
  certifications: { en: 'CERTIFICATIONS', es: 'CERTIFICACIONES' },
  languages: { en: 'LANGUAGES', es: 'IDIOMAS' },
  experience_extra: { en: 'AWARDS', es: 'LOGROS' },
  interests: { en: 'INTERESTS', es: 'INTERESES' },
  references: { en: 'REFERENCES', es: 'REFERENCIAS' },
};

export function textToMarkdown(text, { lang = 'en' } = {}) {
  const lines = toLines(text).filter((line) => !isNoise(line));
  const warnings = [];
  const sections = [];
  const header = [];
  let current = null;

  for (const line of lines) {
    const section = detectSection(line);
    if (section) {
      current = { key: section, lines: [] };
      sections.push(current);
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      header.push(line);
    }
  }

  let name = '';
  const contact = { email: null, phone: null, url: null };
  const contactLines = [];
  for (const raw of header) {
    const line = stripMarkdown(raw).trim();
    if (!line) {
      continue;
    }
    if (isContactLine(line) && !contact.email && !contact.url) {
      Object.assign(contact, contactOf(line));
      contactLines.push(linkify(line));
      continue;
    }
    if (!name && NAME_RE.test(line) && line.split(/\s+/).length <= 4) {
      name = line;
      continue;
    }
    contactLines.push(linkify(line));
  }
  if (!name) {
    const candidate = header
      .map(stripMarkdown)
      .find((line) => has(line) && !isContactLine(line.trim()));
    if (candidate) {
      name = candidate.trim();
      warnings.push('nameGuess');
    } else {
      warnings.push('noName');
    }
  }
  if (!contact.email) {
    warnings.push('noEmail');
  }

  const out = [];
  if (name) {
    out.push(`# ${name}`);
  }
  if (contactLines.length) {
    out.push(contactLines.join(' | '));
  }

  const rank = (key) => {
    const index = SECTION_ORDER.indexOf(key);
    return index === -1 ? SECTION_ORDER.length : index;
  };
  const ordered = [...sections].sort((a, b) => rank(a.key) - rank(b.key));

  ordered.forEach((section, position) => {
    const title = SECTION_TITLES[section.key]?.[lang] || section.key.toUpperCase();
    const body = renderSection(section.key, section.lines, warnings);
    if (!body) {
      return;
    }
    out.push(`## ${title}`, body);
    if (position === ordered.length - 1) {
      out.push('<br>');
    }
  });

  return {
    markdown: `${out.join('\n\n')}\n`,
    name,
    contact,
    sections: ordered
      .filter((section) => section.lines.some(has))
      .map((section) => ({
        key: section.key,
        title: SECTION_TITLES[section.key]?.[lang] || section.key.toUpperCase(),
        lines: section.lines.filter(has).length,
      })),
    warnings,
  };
}

const BULLET_SECTIONS = new Set(['experience', 'projects', 'experience_extra']);

function renderSection(key, lines, warnings) {
  const meaningful = lines.filter(has);
  if (!meaningful.length) {
    return null;
  }

  if (key === 'skills' || key === 'languages' || key === 'interests') {
    const items = [];
    for (const line of meaningful) {
      for (const piece of line.split(/\s*[|·•]\s*|\s{3,}|,\s+/)) {
        const value = piece.replace(BULLET_GLYPH_RE, '').trim();
        if (value && value.length < 40) {
          items.push(value);
        }
      }
    }
    if (items.length > 1) {
      return items.map((item) => `- ${item}`).join('\n');
    }
  }

  const blocks = [];
  let lastKind = null;
  let bullets = [];
  let paragraph = [];

  const flushParagraph = () => {
    const text = paragraphOf(paragraph);
    if (text) {
      const loneAchievement =
        paragraph.length === 1 &&
        lastKind === 'entry' &&
        BULLET_SECTIONS.has(key) &&
        paragraph[0].length <= 180;
      blocks.push(loneAchievement ? `- ${linkify(paragraph[0].trim())}` : text);
      lastKind = loneAchievement ? 'bullet' : 'paragraph';
    }
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(bullets.map((bullet) => `- ${bullet}`).join('\n'));
      lastKind = 'bullet';
    }
    bullets = [];
  };

  for (const line of meaningful) {
    const entry = entryLine(line);
    if (entry) {
      flushParagraph();
      flushBullets();
      blocks.push(entry);
      lastKind = 'entry';
      continue;
    }
    const isBullet = /^[\s•·▪◦‣∙*\-–—o]\s+\S/.test(line) || /^[-–—]\s*\S/.test(line);
    const startsBullet =
      isBullet && (key === 'experience' || key === 'projects' || key === 'experience_extra');
    if (startsBullet) {
      flushParagraph();
      bullets.push(linkify(line.replace(BULLET_GLYPH_RE, '').trim()));
      continue;
    }

    if (bullets.length && !isBullet && line.length < 90 && !/[.;]$/.test(line.trim())) {
      flushBullets();
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushBullets();

  if (!blocks.length) {
    warnings.push('emptySection');
    return null;
  }
  return blocks.join('\n\n');
}
