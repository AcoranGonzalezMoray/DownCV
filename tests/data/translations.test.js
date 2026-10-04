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

  it('labels the interface with words, never with an emoji', () => {
    for (const lang of ['en', 'es']) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(value, `${lang}.${key} carries an emoji`).not.toMatch(
          /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u,
        );
      }
    }
  });
});
