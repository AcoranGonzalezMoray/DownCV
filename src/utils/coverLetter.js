import { Lexer } from 'marked';

const DATE_FORMAT = { en: 'en-GB', es: 'es-ES' };

function textOf(token) {
  const walk = (tokens) =>
    (tokens || [])
      .map((child) => {
        if (child.type === 'text' || child.type === 'escape') {
          return child.tokens?.length ? walk(child.tokens) : child.text || '';
        }
        if (child.type === 'br') {
          return ' ';
        }
        if (child.type === 'link') {
          return child.text || walk(child.tokens);
        }
        return child.tokens?.length ? walk(child.tokens) : child.text || '';
      })
      .join('');
  return walk(token.tokens).replace(/\s+/g, ' ').trim();
}

export function readCvProfile(markdown) {
  let tokens = [];
  try {
    tokens = Lexer.lex(String(markdown || ''), { gfm: true, breaks: true });
  } catch {
    return { name: '', contactLine: '', bullets: [], sections: [], summary: '' };
  }

  const profile = { name: '', contactLine: '', bullets: [], sections: [], summary: '' };
  let section = null;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 1) {
      profile.name = textOf(token);
      continue;
    }
    if (token.type === 'heading' && token.depth === 2) {
      const title = textOf(token).toLowerCase();
      section = /resumen|summary|perfil|profile|about|objetivo/.test(title) ? 'summary' : 'other';
      if (title) {
        profile.sections.push(title);
      }
      continue;
    }
    if (token.type === 'list') {
      for (const item of token.items || []) {
        const text = textOf(item);
        if (text) {
          profile.bullets.push({ text, section });
        }
      }
      continue;
    }
    if (token.type === 'paragraph' && !profile.contactLine) {
      const text = textOf(token);
      if (text && /[@]|https?:|linkedin|github|\+\d|\d{3}/.test(text)) {
        profile.contactLine = text;
      } else if (text && !profile.summary && section === 'summary') {
        profile.summary = text;
      }
    }
  }
  return profile;
}

function isFilled(text) {
  return !/\[[^\]]*\]/.test(text || '');
}

export function pickAchievements(profile, count = 2) {
  const scored = (profile.bullets || [])
    .map((bullet, index) => {
      const hasNumber = /\d/.test(bullet.text);
      const hasVerb =
        /\b(led|led|built|designed|reduced|cut|increased|grew|delivered|launched|migrated|managed|created|developed|rebuilt|automated|owned|drove|negociated|analysed|analyzed|defined|optimised|optimized)\b/i.test(
          bullet.text,
        );

      const weight = (hasNumber ? 2 : 0) + (hasVerb ? 2 : 0) + (bullet.section === 'other' ? 1 : 0);
      return { ...bullet, weight, index };
    })
    .filter((bullet) => bullet.weight > 0 && isFilled(bullet.text))
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return scored.slice(0, count).map((bullet) => bullet.text);
}

export function readJobBrief(jobDescription = '') {
  const text = String(jobDescription || '').trim();
  if (!text) {
    return { role: '', company: '', requirements: [] };
  }
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const role =
    lines
      .slice(0, 4)
      .map((line) =>
        line.match(
          /\b([A-Z][\w+#.-]*(?:\s+[A-Z][\w+#.-]*){0,3})\s*(?:Developer|Engineer|Designer|Manager|Analyst|Scientist|Architect|Lead|Intern)\w*/,
        ),
      )
      .find(Boolean)?.[0] || '';

  const company =
    text.match(/\b(?:at|@|en|for)\s+([A-Z][\w&. -]{2,40})/)?.[1]?.trim() ||
    text.match(/\b([A-Z][\w&.]+(?:\s+[A-Z][\w&.]+)?)\s+(?:is|seeks|busca|looking for)\b/)?.[1] ||
    '';

  const counts = new Map();
  for (const word of text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || []) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const requirements = [...counts.entries()]
    .filter(([word, count]) => count >= 2 && !STOP_WORDS.has(word) && word.length >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([word]) => word);

  return { role, company, requirements };
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'our',
  'your',
  'their',
  'have',
  'has',
  'was',
  'were',
  'are',
  'been',
  'being',
  'will',
  'would',
  'could',
  'should',
  'about',
  'over',
  'under',
  'between',
  'through',
  'using',
  'used',
  'use',
  'uses',
  'all',
  'any',
  'each',
  'more',
  'most',
  'other',
  'such',
  'than',
  'then',
  'they',
  'them',
  'its',
  'not',
  'but',
  'you',
  'our',
  'who',
  'what',
  'when',
  'where',
  'which',
  'while',
  'work',
  'team',
  'teams',
  'role',
  'looking',
  'join',
  'help',
  'need',
  'needs',
  'like',
  'well',
  'also',
  'new',
  'good',
  'great',
  'del',
  'las',
  'los',
  'con',
  'para',
  'por',
  'una',
  'uno',
  'que',
  'como',
  'más',
  'sus',
  'este',
  'esta',
  'estos',
  'estas',
  'nos',
  'nuestro',
  'vuestro',
  'sobre',
  'entre',
  'donde',
  'cuando',
]);

const COPY = {
  en: {
    subject: (role, company) =>
      `Application: ${role || '[the role]'}${company ? ` at ${company}` : ''}`,
    greeting: (company) => `Dear ${company ? `${company} team` : 'hiring team'},`,
    opening: ({ role, company, years }) =>
      `I am writing to apply for the ${role || '[role]'} position${company ? ` at ${company}` : ''}. ` +
      `${years ? `With ${years} years of experience` : 'With a background that matches the role'}, ` +
      'I believe my work is a good fit for what your team is building.',
    middleIntro: 'A few things that back that up:',

    matchIntro: (requirements) =>
      requirements.length > 0
        ? `Your posting asks for ${listInEnglish(requirements)}, which is the work I do.`
        : '',
    matchBody: (requirements) =>
      requirements.length > 0
        ? `Those are not keywords I added for this application: they are the tools I have been shipping with, and the achievements below are what I did with them.`
        : '',
    closing: (role) =>
      `I would be glad to talk about how I can help${role ? ` with ${role}` : ''}. Thank you for your time and consideration.`,
    farewell: 'Kind regards,',
    yearsPlaceholder: '[years]',
    achievementsPlaceholder: '[two achievements from your CV, with a number each]',
    requirementsPlaceholder: '[the requirements of the offer you are answering]',
  },
  es: {
    subject: (role, company) =>
      `Candidatura: ${role || '[el puesto]'}${company ? ` en ${company}` : ''}`,
    greeting: (company) => `Estimado equipo de ${company || 'selección'},`,
    opening: ({ role, company, years }) =>
      `Escribo para solicitar la vacante de ${role || '[puesto]'}${company ? ` en ${company}` : ''}. ` +
      `${years ? `Con ${years} años de experiencia` : 'Con una trayectoria alineada con el puesto'}, ` +
      'creo que mi trabajo encaja con lo que está construyendo vuestro equipo.',
    middleIntro: 'Algunas cosas que lo respaldan:',
    matchIntro: (requirements) =>
      requirements.length > 0
        ? `Vuestra oferta pide ${listInSpanish(requirements)}, que es exactamente el trabajo que hago.`
        : '',
    matchBody: () =>
      'No son palabras clave añadidas para esta candidatura: son las herramientas con las que trabajo, y los logros que siguen son lo que he hecho con ellas.',
    closing: (role) =>
      `Estaré encantada de hablar${role ? ` sobre cómo puedo aportar en ${role}` : ''}. Gracias por vuestro tiempo y consideración.`,
    farewell: 'Un cordial saludo,',
    yearsPlaceholder: '[años]',
    achievementsPlaceholder: '[dos logros de tu CV, cada uno con una cifra]',
    requirementsPlaceholder: '[los requisitos de la oferta a la que respondes]',
  },
};

function listInEnglish(items) {
  if (items.length === 1) {
    return items[0];
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function listInSpanish(items) {
  if (items.length === 1) {
    return items[0];
  }
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function yearsOfExperience(markdown) {
  const match = String(markdown || '').match(
    /(\d{1,2})\s*(?:\+\s*)?(?:years?|años|années|Jahre)\b/i,
  );
  return match ? Number(match[1]) : null;
}

export function buildCoverLetter(
  markdown,
  {
    lang = 'en',
    role = '',
    company = '',
    name = '',
    date = '',
    jobDescription = '',
    match = null,
  } = {},
) {
  const copy = COPY[lang] || COPY.en;
  const profile = readCvProfile(markdown);
  const achievements = pickAchievements(profile, 2);
  const years = yearsOfExperience(markdown);
  const brief = readJobBrief(jobDescription);

  const subjectRole = role || brief.role;
  const subjectCompany = company || brief.company;

  const matched = new Set((match?.matchedKeywords || []).map((word) => word.toLowerCase()));
  const requirements = (match?.matchedKeywords?.length ? match.matchedKeywords : brief.requirements)
    .map((word) => String(word).toLowerCase())
    .filter((word) => (match ? matched.has(word) : true))
    .slice(0, 5);

  const missing = [];
  if (!subjectRole) {
    missing.push('role');
  }
  if (!subjectCompany) {
    missing.push('company');
  }

  const when =
    date ||
    new Date().toLocaleDateString(DATE_FORMAT[lang] || 'en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  const author = name || profile.name;
  if (!author) {
    missing.push('name');
  }

  const lines = [];
  if (author) {
    lines.push(`# ${author}`);
  }
  if (profile.contactLine) {
    lines.push(profile.contactLine);
  }
  lines.push(
    '',
    when,
    '',
    `**${copy.subject(subjectRole, subjectCompany)}**`,
    '',
    copy.greeting(subjectCompany),
    '',
  );

  lines.push(
    copy.opening({
      role: subjectRole,
      company: subjectCompany,
      years: years || copy.yearsPlaceholder,
    }),
  );
  lines.push('');

  if (jobDescription.trim()) {
    lines.push(
      requirements.length > 0 ? copy.matchIntro(requirements) : copy.requirementsPlaceholder,
    );
    lines.push('');
    if (requirements.length > 0) {
      lines.push(copy.matchBody(requirements));
      lines.push('');
    }
  }

  if (achievements.length >= 2) {
    lines.push(copy.middleIntro);
    lines.push('');
    achievements.forEach((achievement) => lines.push(`- ${achievement}`));
  } else {
    if (achievements.length < 2) {
      missing.push('achievements');
    }
    lines.push(copy.middleIntro);
    lines.push('');
    achievements.forEach((achievement) => lines.push(`- ${achievement}`));
    for (let i = achievements.length; i < 2; i += 1) {
      lines.push(`- ${copy.achievementsPlaceholder}`);
    }
  }
  lines.push('');

  lines.push(copy.closing(subjectRole));
  lines.push('');
  lines.push(copy.farewell);
  if (author) {
    lines.push(author);
  }

  return {
    markdown: `${lines.join('\n')}\n`,
    missing,
    name: author,
    contact: profile.contactLine,
    role: subjectRole,
    company: subjectCompany,
    requirements,
  };
}

export function coverLetterToPlainText(markdown) {
  try {
    return Lexer.lex(String(markdown || ''), { gfm: true, breaks: true })
      .map((token) => {
        if (token.type === 'space') {
          return '';
        }
        if (token.type === 'list') {
          return (token.items || []).map((item) => `- ${textOf(item)}`).join('\n');
        }
        return textOf(token);
      })
      .filter(Boolean)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return String(markdown || '')
      .replace(/[#*_>`]/g, '')
      .trim();
  }
}

export function coverLetterPlaceholders(markdown) {
  return String(markdown || '')
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter((entry) => /\[[^\]]*\]/.test(entry.line));
}
