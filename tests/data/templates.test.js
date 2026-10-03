import { describe, it, expect } from 'vitest';
import {
  LAYOUT_TEMPLATES,
  TEMPLATE_IDS,
  applyTemplate,
  getTemplate,
  matchTemplate,
} from '../../src/data/templates';

const base = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  lineHeight: 1.48,
  primaryColor: '#1e293b',
  textColor: '#1e293b',
  subtextColor: '#475569',
  borderStyle: 'line',
  bulletStyle: '•',
  marginY: 24,
  marginX: 28,
  sectionGap: 16,
  itemGap: 10,
};

describe('the layout templates', () => {
  it('are the six the panel offers, each with an id of its own', () => {
    expect(TEMPLATE_IDS).toEqual([
      'ats-classic',
      'modern-executive',
      'technical-compact',
      'elegant-serif',
      'creative-split',
      'minimal-clean',
    ]);
    expect(new Set(TEMPLATE_IDS).size).toBe(TEMPLATE_IDS.length);
  });

  it('only set values the style state really has', () => {
    LAYOUT_TEMPLATES.forEach((template) => {
      expect(Object.keys(template.styles).every((key) => key in base)).toBe(true);
    });
  });

  it('each say something different, so choosing one visibly changes the page', () => {
    const fingerprints = LAYOUT_TEMPLATES.map((template) => JSON.stringify(template.styles));
    expect(new Set(fingerprints).size).toBe(TEMPLATE_IDS.length);
  });

  it('knows the shape of the page they draw, for the preview', () => {
    LAYOUT_TEMPLATES.forEach((template) => {
      expect(['sans', 'serif', 'mono']).toContain(template.family);
      expect(template.density).toBeGreaterThan(0);
      expect(template.density).toBeLessThanOrEqual(1);

      if (template.density > 0.7) {
        expect(template.styles.fontSize).toBeLessThanOrEqual(12.5);
      }
    });
  });
});

describe('applyTemplate', () => {
  it('overlays the template on the styles of the moment', () => {
    const applied = applyTemplate(base, 'elegant-serif');
    expect(applied.styles).toBeUndefined();
    expect(applied.fontFamily).toBe("'Merriweather', serif");
    expect(applied.primaryColor).toBe('#881337');
  });

  it('keeps the values no template speaks about, like the text colour', () => {
    expect(applyTemplate({ ...base, textColor: '#ff0000' }, 'minimal-clean').textColor).toBe(
      '#ff0000',
    );
  });

  it('leaves the styles alone for an id it does not know', () => {
    expect(applyTemplate(base, 'nope')).toBe(base);
    expect(getTemplate('nope')).toBe(null);
  });
});

describe('matchTemplate', () => {
  it('recognises the styles of a template that has not been touched', () => {
    expect(matchTemplate(applyTemplate(base, 'ats-classic'))?.id).toBe('ats-classic');
  });

  it('does not claim a template once a slider moved away from it', () => {
    const nudged = { ...applyTemplate(base, 'ats-classic'), sectionGap: 30 };
    expect(matchTemplate(nudged)).toBe(null);
  });

  it('matches nothing on styles that were never a template', () => {
    expect(matchTemplate(base)).toBe(null);
  });
});
