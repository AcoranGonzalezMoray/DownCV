import { describe, it, expect } from 'vitest';
import {
  CUSTOM_SCHEMA_VERSION,
  activeCustomPoints,
  activeCustomRules,
  createGroup,
  createRule,
  customRulesSignature,
  evaluateCustomRule,
  exportRuleGroups,
  mergeImportedGroups,
  parseRuleGroups,
  sanitizeStoredGroups,
  validateGroup,
  validateRule,
} from '../../src/utils/atsCustomRules';
import { evaluatePdfText } from '../../src/utils/atsPdfEvaluation';

const text = {
  en: 'Docker and Kubernetes',
  es: 'Docker y Kubernetes',
};

const rule = (overrides = {}) => ({
  id: 'rule_1',
  enabled: true,
  dimension: 'keywords',
  points: 5,
  type: 'containsAny',
  params: { terms: ['docker'] },
  title: { en: 'Docker', es: 'Docker' },
  passMessage: { en: 'Docker found.', es: 'Docker encontrado.' },
  failMessage: { en: 'Add Docker.', es: 'Añade Docker.' },
  ...overrides,
});

const group = (overrides = {}) => ({
  id: 'grp_1',
  enabled: true,
  name: { en: 'Backend', es: 'Backend' },
  description: { en: 'Backend rules', es: 'Reglas de backend' },
  rules: [rule()],
  ...overrides,
});

const extraction = (value) => ({
  text: value,
  charCount: value.length,
  wordCount: value.split(/\s+/).filter(Boolean).length,
  pageCount: 1,
  pages: [],
});

describe('validateRule', () => {
  it('accepts a fully localized rule', () => {
    const result = validateRule(rule());
    expect(result.ok).toBe(true);
    expect(result.value.title).toEqual({ en: 'Docker', es: 'Docker' });
  });

  it('requires the title and both messages in both languages', () => {
    expect(validateRule(rule({ title: { en: 'Only English' } })).ok).toBe(false);
    expect(validateRule(rule({ passMessage: { en: 'Only English' } })).ok).toBe(false);
    expect(validateRule(rule({ failMessage: { en: 'Only English' } })).ok).toBe(false);
  });

  it('rejects points outside the allowed range', () => {
    expect(validateRule(rule({ points: 0 })).errors).toContain('points');
    expect(validateRule(rule({ points: 21 })).errors).toContain('points');
    expect(validateRule(rule({ points: 1.5 })).errors).toContain('points');
  });

  it('rejects an invalid regular expression', () => {
    const result = validateRule(rule({ type: 'regex', params: { pattern: '([a-z', flags: 'i' } }));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('pattern');
  });

  it('rejects empty term lists', () => {
    expect(validateRule(rule({ params: { terms: [] } })).errors).toContain('terms');
  });

  it('accepts the generated defaults when the content is filled in', () => {
    const draft = createRule();
    draft.title = { en: 'Title', es: 'Título' };
    draft.passMessage = { en: 'Pass', es: 'Pasa' };
    draft.failMessage = { en: 'Fail', es: 'Falla' };
    draft.params = { terms: ['docker'] };
    expect(validateRule(draft).ok).toBe(true);
  });
});

describe('validateGroup', () => {
  it('accepts a group with valid rules', () => {
    expect(validateGroup(group()).ok).toBe(true);
  });

  it('requires the group name in both languages', () => {
    const result = validateGroup(group({ name: { en: 'Backend' } }));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('name');
  });

  it('requires the group description in both languages', () => {
    const result = validateGroup(group({ description: { en: 'Backend rules' } }));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('description');
  });

  it('propagates the rule errors', () => {
    const result = validateGroup(group({ rules: [rule({ title: {} })] }));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('rules.0.title');
  });

  it('accepts a group without rules', () => {
    expect(validateGroup({ ...createGroup(), name: text, description: text }).ok).toBe(true);
  });
});

describe('sanitizeStoredGroups', () => {
  it('drops groups without a localized name and rules that no longer validate', () => {
    const clean = sanitizeStoredGroups([
      group(),
      { ...group({ id: 'grp_2' }), name: { en: 'Only English' } },
      group({ id: 'grp_3', rules: [rule({ title: {} }), rule({ id: 'rule_2' })] }),
    ]);
    expect(clean.map((entry) => entry.id)).toEqual(['grp_1', 'grp_3']);
    expect(clean[1].rules.map((entry) => entry.id)).toEqual(['rule_2']);
  });

  it('returns an empty list for anything that is not an array', () => {
    expect(sanitizeStoredGroups(null)).toEqual([]);
    expect(sanitizeStoredGroups({})).toEqual([]);
  });
});

describe('activeCustomRules', () => {
  it('skips disabled groups and disabled rules', () => {
    const groups = [
      group(),
      group({ id: 'grp_2', enabled: false }),
      group({ id: 'grp_3', rules: [rule({ id: 'rule_3', enabled: false })] }),
    ];
    const active = activeCustomRules(groups);
    expect(active.map((entry) => entry.id)).toEqual(['rule_1']);
    expect(active[0].groupId).toBe('grp_1');
    expect(activeCustomPoints(groups)).toBe(5);
  });
});

describe('evaluateCustomRule', () => {
  const evaluate = (overrides, value = 'Docker y Kubernetes con Docker') =>
    evaluateCustomRule(rule(overrides), { text: value });

  it('containsAny, containsAll and notContains', () => {
    expect(evaluate({ type: 'containsAny', params: { terms: ['rust'] } })).toBe(false);
    expect(evaluate({ type: 'containsAny', params: { terms: ['rust', 'docker'] } })).toBe(true);
    expect(evaluate({ type: 'containsAll', params: { terms: ['docker', 'kubernetes'] } })).toBe(
      true,
    );
    expect(evaluate({ type: 'containsAll', params: { terms: ['docker', 'rust'] } })).toBe(false);
    expect(evaluate({ type: 'notContains', params: { terms: ['rust'] } })).toBe(true);
    expect(evaluate({ type: 'notContains', params: { terms: ['docker'] } })).toBe(false);
  });

  it('minCount and maxCount', () => {
    expect(evaluate({ type: 'minCount', params: { term: 'docker', min: 2 } })).toBe(true);
    expect(evaluate({ type: 'minCount', params: { term: 'docker', min: 3 } })).toBe(false);
    expect(evaluate({ type: 'maxCount', params: { term: 'docker', max: 2 } })).toBe(true);
    expect(evaluate({ type: 'maxCount', params: { term: 'docker', max: 1 } })).toBe(false);
  });

  it('wordCountRange', () => {
    expect(evaluate({ type: 'wordCountRange', params: { min: 4, max: 6 } })).toBe(true);
    expect(evaluate({ type: 'wordCountRange', params: { min: 6, max: 9 } })).toBe(false);
  });

  it('regex and notRegex', () => {
    expect(evaluate({ type: 'regex', params: { pattern: 'kube\\w+', flags: 'i' } })).toBe(true);
    expect(evaluate({ type: 'regex', params: { pattern: 'rust', flags: 'i' } })).toBe(false);
    expect(evaluate({ type: 'notRegex', params: { pattern: 'rust', flags: 'i' } })).toBe(true);
    expect(evaluate({ type: 'notRegex', params: { pattern: 'docker', flags: 'i' } })).toBe(false);
  });

  it('ignores case and accents', () => {
    const value = 'Formación y GESTIÓN de equipos';
    expect(evaluate({ type: 'containsAny', params: { terms: ['formacion'] } }, value)).toBe(true);
    expect(evaluate({ type: 'containsAny', params: { terms: ['gestion'] } }, value)).toBe(true);
  });

  it('does not match a term inside a longer word', () => {
    expect(
      evaluate({ type: 'containsAny', params: { terms: ['docker'] } }, 'Dockerfiles everywhere'),
    ).toBe(false);
  });
});

describe('export and import', () => {
  it('round-trips groups through the export format', () => {
    const exported = exportRuleGroups([group()]);
    expect(exported.schemaVersion).toBe(CUSTOM_SCHEMA_VERSION);
    expect(exported.groups).toHaveLength(1);

    const parsed = parseRuleGroups(JSON.stringify(exported));
    expect(parsed[0].name).toEqual({ en: 'Backend', es: 'Backend' });
    expect(parsed[0].rules[0].params).toEqual({ terms: ['docker'] });
  });

  it('rejects an unsupported schema and invalid groups', () => {
    expect(() => parseRuleGroups({ schemaVersion: 99, groups: [] })).toThrow('invalid-schema');
    expect(() => parseRuleGroups('not json')).toThrow('invalid-json');
    expect(() =>
      parseRuleGroups({
        schemaVersion: CUSTOM_SCHEMA_VERSION,
        groups: [group({ rules: [rule({ type: 'regex', params: { pattern: '(' } })] })],
      }),
    ).toThrow('invalid-group');
  });

  it('appends imported groups by default and can replace everything', () => {
    const incoming = [group({ id: 'imported', rules: [rule({ id: 'imported-rule' })] })];
    const appended = mergeImportedGroups([group()], incoming);
    expect(appended).toHaveLength(2);
    expect(appended[1].id).not.toBe('imported');
    expect(appended[1].rules[0].id).not.toBe('imported-rule');

    const replaced = mergeImportedGroups([group()], incoming, { replace: true });
    expect(replaced).toHaveLength(1);
    expect(replaced[0].id).not.toBe('imported');
  });
});

describe('customRulesSignature', () => {
  it('changes when the active rules change', () => {
    const first = customRulesSignature([rule()]);
    expect(customRulesSignature([rule()])).toBe(first);
    expect(customRulesSignature([rule({ points: 6 })])).not.toBe(first);
    expect(customRulesSignature([])).not.toBe(first);
  });
});

describe('custom rules in the evaluation', () => {
  const cv = `${'Docker and Kubernetes experience with measurable results. '.repeat(10)}
Ana Gomez
ana@example.com
+34 600 000 000
SUMMARY
EXPERIENCE
- Led the migration to Docker and Kubernetes.
EDUCATION
SKILLS`;

  it('leaves the base score untouched when there are no custom rules', () => {
    const result = evaluatePdfText(extraction(cv), { lang: 'en', text: cv });
    expect(result.rulesSignature).toBe('');
    expect(result.totalPoints).toBe(100);
    expect(result.customMaxPoints).toBe(0);
    expect(result.maxScore).toBe(100);
  });

  it('adds custom checks, normalizes the score and signs the active rules', () => {
    const base = evaluatePdfText(extraction(cv), { lang: 'en', text: cv });
    const result = evaluatePdfText(extraction(cv), {
      lang: 'en',
      text: cv,
      customRules: [rule()],
    });

    const custom = result.checks.find((check) => check.id === 'custom:rule_1');
    expect(custom).toMatchObject({
      custom: true,
      dimension: 'keywords',
      pass: true,
      points: 5,
      max: 5,
    });
    expect(result.totalPoints).toBe(105);
    expect(result.maxScore).toBe(100);
    expect(result.customMaxPoints).toBe(5);
    expect(result.customPoints).toBe(5);
    expect(result.rulesSignature).not.toBe('');
    expect(result.score).toBeGreaterThanOrEqual(base.score);
    expect(result.gaps.some((gap) => gap.id === 'custom:rule_1')).toBe(false);
  });

  it('turns a failing custom rule into a gap with its localized message', () => {
    const result = evaluatePdfText(extraction(cv), {
      lang: 'es',
      text: cv,
      customRules: [rule({ params: { terms: ['rust'] } })],
    });
    const gap = result.gaps.find((entry) => entry.id === 'custom:rule_1');
    expect(gap).toBeTruthy();
    expect(gap.lost).toBe(5);
    expect(gap.msg).toBe('Añade Docker.');
  });
});
