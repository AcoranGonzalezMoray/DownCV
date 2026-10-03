import { describe, it, expect } from 'vitest';
import { translations } from '../../src/data/translations';

describe('translations', () => {
  it('has the same keys in English and Spanish', () => {
    const en = Object.keys(translations.en).sort();
    const es = Object.keys(translations.es).sort();
    expect(es).toEqual(en);
  });

  it('leaves no key empty in either language', () => {
    for (const lang of ['en', 'es']) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(typeof value, `${lang}.${key} is not a string`).toBe('string');
        expect(value.trim().length, `${lang}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('only ships the two supported languages', () => {
    expect(Object.keys(translations).sort()).toEqual(['en', 'es']);
  });
});
