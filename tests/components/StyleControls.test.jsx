import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import StyleControls from '../../src/components/StyleControls';
import { applyTemplate } from '../../src/data/templates';
import { translations } from '../../src/data/translations';

const t = translations.en;

const baseStyles = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  lineHeight: 1.48,
  marginX: 28,
  marginY: 24,
  sectionGap: 16,
  itemGap: 10,
  primaryColor: '#1e293b',
  textColor: '#1e293b',
  subtextColor: '#475569',
  borderStyle: 'line',
  bulletStyle: '•',
};

const renderControls = (initial = baseStyles) => {
  const resetStyles = vi.fn();
  const view = render(<Harness initial={initial} resetStyles={resetStyles} />);
  return { resetStyles, ...view };
};

function Harness({ initial, resetStyles }) {
  const [styles, setStyles] = useState(initial);
  return (
    <StyleControls styles={styles} setStyles={setStyles} resetStyles={resetStyles} t={t} />
  );
}

describe('StyleControls', () => {
  afterEach(() => cleanup());

  it('offers the six layout presets as cards with a drawing', () => {
    const { container } = renderControls();
    expect(container.querySelectorAll('[aria-pressed]')).toHaveLength(6);
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(6);
  });

  it('marks the preset in use and switches to another one on click', () => {
    const classic = applyTemplate(baseStyles, 'ats-classic');
    const { container } = renderControls(classic);

    const cards = () => Array.from(container.querySelectorAll('[aria-pressed]'));
    expect(cards().filter((card) => card.getAttribute('aria-pressed') === 'true')).toHaveLength(
      1,
    );

    fireEvent.click(cards().find((card) => card.getAttribute('aria-pressed') === 'false'));
    expect(cards().filter((card) => card.getAttribute('aria-pressed') === 'true')).toHaveLength(
      1,
    );
  });

  it('says so when the sliders moved away from every preset', () => {
    renderControls({ ...baseStyles, fontSize: 15.5 });
    expect(screen.getByText(t.templatesCustomized)).toBeTruthy();
  });

  it('changes the font through the typography select', () => {
    const { container } = renderControls();
    const select = container.querySelectorAll('select')[0];
    fireEvent.change(select, { target: { value: "'Merriweather', serif" } });
    expect(container.querySelectorAll('select')[0].value).toBe("'Merriweather', serif");
  });

  it('changes the accent color through a preset swatch', () => {
    const { container } = renderControls();
    fireEvent.click(screen.getByTitle('Navy'));
    expect(container.querySelector('input[type="color"]').value).toBe('#0f172a');
  });

  it('changes the accent color through the custom picker', () => {
    const { container } = renderControls();
    const picker = container.querySelector('input[type="color"]');
    fireEvent.change(picker, { target: { value: '#ff0000' } });
    expect(container.querySelector('input[type="color"]').value).toBe('#ff0000');
  });

  it('changes the header and bullet styles', () => {
    const { container } = renderControls();
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'badge' } });
    fireEvent.change(selects[2], { target: { value: '-' } });
    const updated = container.querySelectorAll('select');
    expect(updated[1].value).toBe('badge');
    expect(updated[2].value).toBe('-');
  });

  it('moves numeric sliders with the right precision', () => {
    const { container } = renderControls();
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(6);

    fireEvent.change(sliders[0], { target: { value: '14.5' } });
    expect(container.querySelectorAll('input[type="range"]')[0].value).toBe('14.5');

    fireEvent.change(container.querySelectorAll('input[type="range"]')[2], {
      target: { value: '30' },
    });
    expect(container.querySelectorAll('input[type="range"]')[2].value).toBe('30');
  });

  it('resets everything through the reset button', () => {
    const { resetStyles } = renderControls();
    fireEvent.click(screen.getByRole('button', { name: t.reset }));
    expect(resetStyles).toHaveBeenCalledTimes(1);
  });
});
