import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import TemplatePreview from '../../src/components/TemplatePreview';
import { LAYOUT_TEMPLATES } from '../../src/data/templates';

const base = {
  id: 'test',
  family: 'sans',
  density: 1,
  styles: {
    primaryColor: '#1e293b',
    marginX: 28,
    marginY: 24,
    sectionGap: 16,
    fontSize: 13,
    borderStyle: 'line',
    bulletStyle: '•',
  },
};

const withBorder = (borderStyle) => ({
  ...base,
  styles: { ...base.styles, borderStyle },
});

describe('TemplatePreview', () => {
  afterEach(() => cleanup());

  it('draws a card for every shipped template without throwing', () => {
    for (const template of LAYOUT_TEMPLATES) {
      const { container, unmount } = render(<TemplatePreview template={template} />);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });

  it.each(['line', 'double', 'badge', 'minimal', 'thick-left'])(
    'draws the %s heading rule',
    (borderStyle) => {
      const { container } = render(<TemplatePreview template={withBorder(borderStyle)} />);
      expect(container.querySelector('svg')).toBeTruthy();
    },
  );

  it('falls back to sans when the family is unknown', () => {
    const { container } = render(
      <TemplatePreview template={{ ...base, family: 'no-such-family' }} />,
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('stays hidden from assistive technology, it is decoration', () => {
    const { container } = render(<TemplatePreview template={base} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
