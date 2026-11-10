export const DIMENSION_GROUPS = {
  structure: ['text', 'pages', 'length', 'residue', 'emoji', 'language'],
  contact: ['contact', 'sections', 'headings', 'dates', 'filename'],
  verbs: ['verbs', 'phrasing'],
  metrics: ['metrics', 'bullets', 'duplicates'],
  keywords: ['keywords', 'density', 'stuffing'],
};

export const DIMENSION_IDS = ['structure', 'contact', 'verbs', 'metrics', 'keywords'];

export function scoreDimensions(checks = []) {
  const byId = new Map();
  checks.forEach((check) => {
    if (check?.id) {
      byId.set(check.id, check);
    }
  });

  const buckets = Object.fromEntries(DIMENSION_IDS.map((id) => [id, []]));

  DIMENSION_IDS.forEach((id) => {
    DIMENSION_GROUPS[id].forEach((checkId) => {
      const check = byId.get(checkId);
      if (check) {
        buckets[id].push(check);
      }
    });
  });

  checks.forEach((check) => {
    if (!check?.id) {
      return;
    }
    const isCustom = check.custom || check.id.startsWith('custom:');
    if (!isCustom) {
      return;
    }
    const dimension = DIMENSION_IDS.includes(check.dimension) ? check.dimension : 'structure';
    buckets[dimension].push(check);
  });

  return DIMENSION_IDS.map((id) => {
    const members = buckets[id];
    const points = members.reduce((total, check) => total + (Number(check.points) || 0), 0);
    const max = members.reduce((total, check) => total + (Number(check.max) || 0), 0);
    return {
      id,
      points,
      max,
      percent: max > 0 ? Math.round((points / max) * 100) : 100,
      lost: Math.max(0, max - points),
      failed: members.filter((check) => !check.pass).map((check) => check.title || check.id),
    };
  });
}

const ADVICE = {
  structure: {
    en: 'Make the document fit the page it is sent on: a readable text layer, one or two pages, no Markdown leftovers.',
    es: 'Haz que el documento quepa en la página que se envía: texto legible, una o dos páginas, sin restos de Markdown.',
  },
  contact: {
    en: 'Add the email, the phone and a profile link, and use the section headings a parser looks for.',
    es: 'Añade el email, el teléfono y un enlace a tu perfil, y usa los encabezados que busca un parser.',
  },
  verbs: {
    en: 'Start the achievements with a verb: led, built, cut, grew, delivered.',
    es: 'Empieza los logros con un verbo: lideré, construí, reduje, crecí, entregué.',
  },
  metrics: {
    en: 'Add the number behind each achievement: a percentage, an amount, a size, a deadline.',
    es: 'Añade la cifra de cada logro: un porcentaje, un importe, un volumen, una fecha.',
  },
  keywords: {
    en: 'Use the words of the job offer and keep the density comfortable, without repeating them.',
    es: 'Usa las palabras de la oferta y mantén una densidad cómoda, sin repetirlas.',
  },
};

export function dimensionAdvice(id, lang = 'en') {
  const entry = ADVICE[id];
  return (entry && (entry[lang] || entry.en)) || '';
}
