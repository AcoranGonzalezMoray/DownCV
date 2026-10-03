import { describe, it, expect } from 'vitest';
import { createVariant, summarizeVariant, upsertVariant, variantDelta } from '../../src/utils/cvVariants';

const BASE = `# Ana Gomez

**Fullstack Engineer**

## Skills

React, TypeScript, PostgreSQL, Docker

## Experience

- Led the billing migration, cutting deploys by 45%
`;

describe('variantDelta', () => {
  it('names the words a variant added for the posting', () => {
    const tailored = `${BASE}
## Projects

- Shipped a Kubernetes operator for the payments platform
`;
    const { added } = variantDelta(BASE, tailored);
    expect(added).toEqual(expect.arrayContaining(['kubernetes', 'payments', 'operator']));
  });

  it('names the words the variant dropped, so nothing stale is sent on purpose', () => {
    const swapped = BASE.replace('PostgreSQL, Docker', 'MongoDB');
    const { added, removed } = variantDelta(BASE, swapped);
    expect(removed).toEqual(expect.arrayContaining(['postgresql', 'docker']));
    expect(added).toContain('mongodb');
  });

  it('says nothing when the two documents are the same', () => {
    expect(variantDelta(BASE, BASE)).toEqual({ added: [], removed: [] });
  });

  it('does not count the words of the language twice', () => {
    
    const { added } = variantDelta(
      BASE,
      `${BASE}\n- Un trabajo para la empresa con mas de 10 anos`,
    );
    expect(added).not.toEqual(expect.arrayContaining(['para', 'con', 'de']));
  });

  it('keeps the answer short enough to read on a chip', () => {
    const noisy = `${BASE}\n${Array.from({ length: 40 }, (_, i) => `- Logro numero ${i}`).join('\n')}`;
    expect(variantDelta(BASE, noisy).added.length).toBeLessThanOrEqual(12);
  });
});

describe('createVariant', () => {
  it('copies the CV it is derived from, so nothing has to be typed twice', () => {
    const variant = createVariant({ name: 'Acme — Frontend', markdown: BASE, now: 1700000000000 });
    expect(variant.markdown).toBe(BASE);
    expect(variant.name).toBe('Acme — Frontend');
    expect(variant.id).toBe('var_acme-frontend_1700000000000');
    expect(variant.createdAt).toBe('2023-11-14T22:13:20.000Z');
  });

  it('always has a usable id, even for a name with nothing to slug', () => {
    expect(createVariant({ name: '***', markdown: '', now: 1 }).id).toBe('var_variant_1');
  });
});

describe('summarizeVariant', () => {
  it('reads as added when the variant says more than the base', () => {
    const variant = { markdown: `${BASE}\n- Built a Kubernetes operator` };
    expect(summarizeVariant(variant, BASE).tone).toBe('added');
  });

  it('stays neutral for a variant that is a plain copy of the base', () => {
    expect(summarizeVariant({ markdown: BASE }, BASE).tone).toBe('neutral');
  });

  it('has nothing to compare when there is no base', () => {
    expect(summarizeVariant({ markdown: BASE }, '')).toEqual({
      tone: 'neutral',
      added: [],
      removed: [],
    });
  });
});

describe('upsertVariant', () => {
  const one = createVariant({ name: 'Acme', markdown: BASE, now: 1 });

  it('adds a variant that is not there yet', () => {
    expect(upsertVariant([], one)).toHaveLength(1);
  });

  it('updates the one with the same id instead of listing it twice', () => {
    const updated = { ...one, markdown: `${BASE}\n- New line` };
    const list = upsertVariant(upsertVariant([], one), updated);
    expect(list).toHaveLength(1);
    expect(list[0].markdown).toBe(`${BASE}\n- New line`);
  });

  it('never crashes on a list that was never a list', () => {
    expect(upsertVariant(null, one)).toHaveLength(1);
  });
});
