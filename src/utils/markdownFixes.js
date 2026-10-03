const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}\b/;
const PROFILE_RE = /(linkedin\.com|github\.com|behance\.net)/i;
const SUMMARY_RE = /^(#{1,6})[^\n]*\b(resumen|perfil|summary|profile|objective|objetivo|about)\b/im;

function insertAfterTitle(markdown, block) {
  const lines = markdown.split('\n');
  const titleIndex = lines.findIndex((line) => /^#{1,6}\s+\S/.test(line));
  if (titleIndex === -1) {
    return `${block}\n\n${markdown.replace(/^\s+/, '')}`.replace(/\s+$/, '\n');
  }
  let insertAt = titleIndex + 1;

  while (insertAt < lines.length && !lines[insertAt].trim()) {
    insertAt += 1;
  }
  const next = lines[insertAt] || '';
  if (next.trim() && !/^#{1,6}\s/.test(next) && !/^\s*[-*+]\s/.test(next)) {
    insertAt += 1;
  }
  const before = lines.slice(0, insertAt).join('\n').replace(/\s+$/, '');
  const after = lines.slice(insertAt).join('\n').replace(/^\s+/, '');
  return `${before}\n\n${block}${after ? `\n\n${after}` : ''}\n`;
}

const FIXES = {
  insertContact: (markdown, lang) => {
    if (EMAIL_RE.test(markdown) && PHONE_RE.test(markdown) && PROFILE_RE.test(markdown)) {
      return null;
    }
    const block =
      lang === 'es'
        ? 'email@ejemplo.com | +34 600 000 000 | linkedin.com/in/usuario'
        : 'email@example.com | +1 555 000 0000 | linkedin.com/in/username';
    return { markdown: insertAfterTitle(markdown, block), caretOffset: 0 };
  },

  insertSummary: (markdown, lang) => {
    if (SUMMARY_RE.test(markdown)) {
      return null;
    }
    const block =
      lang === 'es'
        ? '## RESUMEN PROFESIONAL\n\n[Dos o tres líneas con años de experiencia, especialidad, impacto medible y lo que buscas en el siguiente puesto.]'
        : '## PROFESSIONAL SUMMARY\n\n[Two or three lines with years of experience, specialism, measurable impact and what you are looking for next.]';
    return { markdown: insertAfterTitle(markdown, block), caretOffset: 0 };
  },
};

export function applyFix(markdown, fix, lang = 'en') {
  if (!fix || !FIXES[fix.type]) {
    return null;
  }

  const result = FIXES[fix.type](markdown || '', fix.lang || lang);
  if (!result || result.markdown === markdown) {
    return null;
  }
  return { markdown: result.markdown, applied: true, type: fix.type };
}

export function canApplyFix(markdown, fix, lang = 'en') {
  return applyFix(markdown, fix, lang) !== null;
}

export function applyAllFixes(markdown, checks, lang = 'en') {
  const order = ['insertContact', 'insertSummary'];
  const available = new Map();
  for (const check of checks || []) {
    const type = check?.fix?.type;
    if (type && !available.has(type)) {
      available.set(type, check.fix);
    }
  }
  const types = [...available.keys()].sort((a, b) => {
    const rank = (type) => {
      const index = order.indexOf(type);
      return index === -1 ? order.length : index;
    };
    return rank(a) - rank(b);
  });

  let current = markdown;
  const applied = [];
  for (const type of types) {
    const result = applyFix(current, available.get(type), lang);
    if (result) {
      current = result.markdown;
      applied.push(type);
    }
  }
  return { markdown: current, applied };
}

export function pendingFixes(markdown, checks, lang = 'en') {
  const seen = new Map();
  for (const check of checks || []) {
    const type = check?.fix?.type;
    if (type && !seen.has(type) && canApplyFix(markdown, check.fix, lang)) {
      seen.set(type, check.fix);
    }
  }
  return [...seen.values()];
}
