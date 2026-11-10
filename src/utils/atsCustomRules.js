export const CUSTOM_SCHEMA_VERSION = 1;

export const CUSTOM_RULE_TYPES = [
  'containsAny',
  'containsAll',
  'notContains',
  'minCount',
  'maxCount',
  'wordCountRange',
  'regex',
  'notRegex',
];

export const CUSTOM_DIMENSIONS = ['structure', 'contact', 'verbs', 'metrics', 'keywords'];

const TERM_TYPES = new Set(['containsAny', 'containsAll', 'notContains']);
const REGEX_TYPES = new Set(['regex', 'notRegex']);
const MIN_POINTS = 1;
const MAX_POINTS = 20;
const MAX_TERMS = 50;
const MAX_TERM_LENGTH = 120;
const MAX_PATTERN_LENGTH = 500;

const emptyText = () => ({ en: '', es: '' });

const stripAccents = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uid = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const localized = (value) => {
  if (typeof value === 'string') {
    const text = value.trim();
    return { en: text, es: text };
  }
  if (value && typeof value === 'object') {
    return {
      en: String(value.en ?? '').trim(),
      es: String(value.es ?? '').trim(),
    };
  }
  return emptyText();
};

const hasText = (value) => Boolean(value && value.en && value.es);

export function defaultRuleParams(type) {
  if (TERM_TYPES.has(type)) {
    return { terms: [] };
  }
  if (type === 'minCount') {
    return { term: '', min: 1 };
  }
  if (type === 'maxCount') {
    return { term: '', max: 0 };
  }
  if (type === 'wordCountRange') {
    return { min: 0, max: 0 };
  }
  return { pattern: '', flags: 'i' };
}

export function createGroup() {
  return {
    id: uid('grp'),
    enabled: true,
    name: emptyText(),
    description: emptyText(),
    rules: [],
  };
}

export function createRule(type = 'containsAny') {
  return {
    id: uid('rule'),
    enabled: true,
    dimension: 'keywords',
    points: 2,
    type,
    params: defaultRuleParams(type),
    title: emptyText(),
    passMessage: emptyText(),
    failMessage: emptyText(),
  };
}

function validateParams(type, params = {}) {
  const errors = [];
  const value = {};

  if (TERM_TYPES.has(type)) {
    const terms = Array.isArray(params.terms)
      ? params.terms.map((term) => String(term ?? '').trim()).filter(Boolean)
      : [];
    value.terms = terms;
    if (
      terms.length === 0 ||
      terms.length > MAX_TERMS ||
      terms.some((term) => term.length > MAX_TERM_LENGTH)
    ) {
      errors.push('terms');
    }
    return { errors, value };
  }

  if (type === 'minCount') {
    value.term = String(params.term ?? '').trim();
    value.min = Number(params.min);
    if (!value.term || value.term.length > MAX_TERM_LENGTH) {
      errors.push('term');
    }
    if (!Number.isInteger(value.min) || value.min < 1) {
      errors.push('min');
    }
    return { errors, value };
  }

  if (type === 'maxCount') {
    value.term = String(params.term ?? '').trim();
    value.max = Number(params.max);
    if (!value.term || value.term.length > MAX_TERM_LENGTH) {
      errors.push('term');
    }
    if (!Number.isInteger(value.max) || value.max < 0) {
      errors.push('max');
    }
    return { errors, value };
  }

  if (type === 'wordCountRange') {
    value.min = Number(params.min);
    value.max = Number(params.max);
    if (!Number.isInteger(value.min) || value.min < 0) {
      errors.push('min');
    }
    if (!Number.isInteger(value.max) || value.max < value.min) {
      errors.push('max');
    }
    return { errors, value };
  }

  if (REGEX_TYPES.has(type)) {
    value.pattern = String(params.pattern ?? '').trim();
    value.flags = String(params.flags ?? 'i').replace(/[^imsu]/g, '') || 'i';
    if (!value.pattern || value.pattern.length > MAX_PATTERN_LENGTH) {
      errors.push('pattern');
    } else {
      try {
        new RegExp(value.pattern, value.flags);
      } catch (_error) {
        errors.push('pattern');
      }
    }
    return { errors, value };
  }

  errors.push('type');
  return { errors, value };
}

export function validateRule(input) {
  const errors = [];
  const type = CUSTOM_RULE_TYPES.includes(input?.type) ? input.type : '';
  const dimension = CUSTOM_DIMENSIONS.includes(input?.dimension) ? input.dimension : '';
  const points = Number(input?.points);
  const title = localized(input?.title);
  const passMessage = localized(input?.passMessage);
  const failMessage = localized(input?.failMessage);

  if (!type) {
    errors.push('type');
  }
  if (!dimension) {
    errors.push('dimension');
  }
  if (!Number.isInteger(points) || points < MIN_POINTS || points > MAX_POINTS) {
    errors.push('points');
  }
  if (!hasText(title)) {
    errors.push('title');
  }
  if (!hasText(passMessage)) {
    errors.push('passMessage');
  }
  if (!hasText(failMessage)) {
    errors.push('failMessage');
  }

  const params = type ? validateParams(type, input?.params) : { errors: [], value: {} };
  errors.push(...params.errors);

  const value = {
    id: typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : uid('rule'),
    enabled: input?.enabled !== false,
    dimension: dimension || 'structure',
    points: Number.isInteger(points) ? points : MIN_POINTS,
    type: type || 'containsAny',
    params: params.value,
    title,
    passMessage,
    failMessage,
  };

  return { ok: errors.length === 0, errors, value };
}

export function validateGroup(input) {
  const errors = [];
  const name = localized(input?.name);
  const description = localized(input?.description);

  if (!hasText(name)) {
    errors.push('name');
  }
  if (!hasText(description)) {
    errors.push('description');
  }

  const rawRules = Array.isArray(input?.rules) ? input.rules : null;
  const rules = [];
  if (!rawRules) {
    errors.push('rules');
  } else {
    const seen = new Set();
    rawRules.forEach((rawRule, index) => {
      const result = validateRule(rawRule);
      errors.push(...result.errors.map((error) => `rules.${index}.${error}`));
      if (!seen.has(result.value.id)) {
        seen.add(result.value.id);
        rules.push(result.value);
      }
    });
  }

  const value = {
    id: typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : uid('grp'),
    enabled: input?.enabled !== false,
    name,
    description,
    rules,
  };

  return { ok: errors.length === 0, errors, value };
}

export function sanitizeStoredGroups(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((rawGroup) => {
    const name = localized(rawGroup?.name);
    if (!hasText(name)) {
      return [];
    }
    const rules = (Array.isArray(rawGroup?.rules) ? rawGroup.rules : [])
      .map((rawRule) => validateRule(rawRule))
      .filter((result) => result.ok)
      .map((result) => result.value);
    return [
      {
        id:
          typeof rawGroup?.id === 'string' && rawGroup.id.trim() ? rawGroup.id.trim() : uid('grp'),
        enabled: rawGroup?.enabled !== false,
        name,
        description: localized(rawGroup?.description),
        rules,
      },
    ];
  });
}

export function activeCustomRules(groups = []) {
  const active = [];
  for (const group of groups || []) {
    if (!group || group.enabled === false) {
      continue;
    }
    for (const rule of group.rules || []) {
      if (!rule || rule.enabled === false) {
        continue;
      }
      active.push({ ...rule, groupId: group.id, groupName: group.name });
    }
  }
  return active;
}

export function activeCustomPoints(groups = []) {
  return activeCustomRules(groups).reduce((total, rule) => total + (Number(rule.points) || 0), 0);
}

const hashString = (value) => {
  let result = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    result = (result * 31 + text.charCodeAt(index)) | 0;
  }
  return String(result);
};

export function customRulesSignature(rules = []) {
  return hashString(
    JSON.stringify(
      (rules || []).map((rule) => ({
        id: rule.id,
        enabled: rule.enabled,
        dimension: rule.dimension,
        points: rule.points,
        type: rule.type,
        params: rule.params,
        title: rule.title,
        passMessage: rule.passMessage,
        failMessage: rule.failMessage,
      })),
    ),
  );
}

function countOccurrences(haystack, term) {
  const needle = stripAccents(String(term || '').toLowerCase()).trim();
  if (!needle) {
    return 0;
  }
  if (/^[\p{L}\p{N}]+$/u.test(needle)) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`,
      'gu',
    );
    return (haystack.match(pattern) || []).length;
  }
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

export function evaluateCustomRule(rule, { text = '', flat, wordCount } = {}) {
  const source = String(text || '');
  const haystack = flat ?? stripAccents(source.toLowerCase());
  const totalWords = Number.isFinite(wordCount)
    ? wordCount
    : source.split(/\s+/).filter(Boolean).length;
  const params = rule?.params || {};

  switch (rule?.type) {
    case 'containsAny':
      return (params.terms || []).some((term) => countOccurrences(haystack, term) > 0);
    case 'containsAll':
      return (
        (params.terms || []).length > 0 &&
        (params.terms || []).every((term) => countOccurrences(haystack, term) > 0)
      );
    case 'notContains':
      return (
        (params.terms || []).length > 0 &&
        (params.terms || []).every((term) => countOccurrences(haystack, term) === 0)
      );
    case 'minCount':
      return countOccurrences(haystack, params.term) >= (Number(params.min) || 0);
    case 'maxCount':
      return countOccurrences(haystack, params.term) <= (Number(params.max) || 0);
    case 'wordCountRange':
      return totalWords >= (Number(params.min) || 0) && totalWords <= (Number(params.max) || 0);
    case 'regex':
      try {
        return new RegExp(params.pattern, params.flags || 'i').test(source);
      } catch (_error) {
        return false;
      }
    case 'notRegex':
      try {
        return !new RegExp(params.pattern, params.flags || 'i').test(source);
      } catch (_error) {
        return false;
      }
    default:
      return false;
  }
}

export function exportRuleGroups(groups = []) {
  return {
    schemaVersion: CUSTOM_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    groups: sanitizeStoredGroups(groups),
  };
}

export function parseRuleGroups(input) {
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (_error) {
      throw new Error('invalid-json');
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('invalid-data');
  }
  if (Number(data.schemaVersion) !== CUSTOM_SCHEMA_VERSION) {
    throw new Error('invalid-schema');
  }
  if (!Array.isArray(data.groups)) {
    throw new Error('invalid-data');
  }

  return data.groups.map((rawGroup) => {
    const result = validateGroup(rawGroup);
    if (!result.ok) {
      throw new Error('invalid-group');
    }
    return result.value;
  });
}

export function mergeImportedGroups(existing = [], incoming = [], { replace = false } = {}) {
  const prepared = (incoming || []).map((group) => ({
    ...group,
    id: uid('grp'),
    rules: (group.rules || []).map((rule) => ({ ...rule, id: uid('rule') })),
  }));
  if (replace) {
    return prepared;
  }
  return [...(existing || []), ...prepared];
}
