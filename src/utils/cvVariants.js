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
  'his',
  'her',
  'per',
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
  'the',
]);

function keywordsOf(markdown) {
  const text = String(markdown || '').toLowerCase();
  const found = new Map();
  for (const raw of text.split(/[^\p{L}\p{N}+#.-]+/u)) {
    const word = raw.replace(/^[.-]+|[.-]+$/g, '');
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) {
      continue;
    }
    found.set(word, (found.get(word) || 0) + 1);
  }
  return found;
}

export function variantDelta(baseMarkdown, variantMarkdown) {
  const base = keywordsOf(baseMarkdown);
  const variant = keywordsOf(variantMarkdown);

  const added = [];
  const removed = [];
  variant.forEach((count, word) => {
    const before = base.get(word) || 0;
    if (count > before) {
      added.push({ word, gain: count - before });
    }
  });
  base.forEach((count, word) => {
    const after = variant.get(word) || 0;
    if (count > after) {
      removed.push({ word, gain: count - after });
    }
  });

  const byGain = (a, b) => b.gain - a.gain || a.word.localeCompare(b.word);
  return {
    added: added
      .sort(byGain)
      .slice(0, 12)
      .map((entry) => entry.word),
    removed: removed
      .sort(byGain)
      .slice(0, 12)
      .map((entry) => entry.word),
  };
}

const slug = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'variant';

export function createVariant({ name, markdown, baseId = null, now = Date.now() }) {
  return {
    id: `var_${slug(name)}_${now}`,
    name: String(name || 'Variant').trim(),
    baseId,
    markdown: String(markdown || ''),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
}

export function summarizeVariant(variant, baseMarkdown) {
  if (!baseMarkdown) {
    return { tone: 'neutral', added: [], removed: [] };
  }
  const { added, removed } = variantDelta(baseMarkdown, variant?.markdown);
  if (added.length === 0 && removed.length === 0) {
    return { tone: 'neutral', added, removed };
  }
  return { tone: added.length > 0 ? 'added' : 'removed', added, removed };
}

export function upsertVariant(variants, variant) {
  const list = Array.isArray(variants) ? variants : [];
  const index = list.findIndex((entry) => entry.id === variant.id);
  if (index < 0) {
    return [variant, ...list];
  }
  return list.map((entry, position) => (position === index ? { ...entry, ...variant } : entry));
}
