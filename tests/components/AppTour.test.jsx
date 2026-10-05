import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import AppTour, { buildTourSteps } from '../../src/components/AppTour';
import { translations } from '../../src/data/translations';

const t = translations.en;

const renderTour = (overrides = {}) => {
  const onDone = vi.fn();
  render(<AppTour open t={t} onDone={onDone} {...overrides} />);
  return { onDone };
};

const withTargets = () =>
  ['editor', 'preview', 'sidebar', 'ai', 'export', 'palette'].map((id) => (
    <div key={id} data-tour={id} />
  ));

describe('AppTour', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing while closed', () => {
    const { container } = render(<AppTour open={false} t={t} onDone={vi.fn()} />);
    expect(container.firstChild).toBe(null);
  });

  it('welcomes first, with the step count', () => {
    renderTour();
    expect(screen.getByRole('dialog', { name: t.tourWelcomeTitle })).toBeTruthy();
    expect(screen.getByText(t.tourWelcomeBody)).toBeTruthy();
    expect(screen.getByText('1 / 7')).toBeTruthy();
  });

  it('walks forward and back through the steps', () => {
    render(
      <>
        {withTargets()}
        <AppTour open t={t} onDone={vi.fn()} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.tourNext }));
    expect(screen.getByRole('dialog', { name: t.tourEditorTitle })).toBeTruthy();
    expect(screen.getByText('2 / 7')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: t.tourBack }));
    expect(screen.getByRole('dialog', { name: t.tourWelcomeTitle })).toBeTruthy();
  });

  it('skips a step whose anchor is not on screen', () => {
    render(
      <>
        <div data-tour="preview" />
        <AppTour open t={t} onDone={vi.fn()} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.tourNext }));
    expect(screen.getByRole('dialog', { name: t.tourPreviewTitle })).toBeTruthy();
  });

  it('finishes on the last step and never shows a back button on the first', () => {
    const onDone = vi.fn();
    render(
      <>
        {withTargets()}
        <AppTour open t={t} onDone={onDone} />
      </>,
    );
    expect(screen.queryByRole('button', { name: t.tourBack })).toBe(null);
    for (let step = 0; step < 6; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: t.tourNext }));
    }
    fireEvent.click(screen.getByRole('button', { name: t.tourFinish }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skips, closes and escapes straight to done', () => {
    const first = renderTour();
    fireEvent.click(screen.getByRole('button', { name: t.tourSkip }));
    expect(first.onDone).toHaveBeenCalledTimes(1);
    cleanup();

    const second = renderTour();
    fireEvent.click(screen.getByRole('button', { name: t.cancel }));
    expect(second.onDone).toHaveBeenCalledTimes(1);
    cleanup();

    const third = renderTour();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(third.onDone).toHaveBeenCalledTimes(1);
  });

  it('rings the anchored element', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      left: 20,
      width: 100,
      height: 50,
      right: 120,
      bottom: 60,
      x: 20,
      y: 10,
    });
    render(
      <>
        <div data-tour="editor" />
        <AppTour open t={t} onDone={vi.fn()} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.tourNext }));
    const ring = document.querySelector('div[style*="width: 112px"]');
    expect(ring).toBeTruthy();
    expect(ring.getAttribute('style')).toContain('top: 4px');
  });

  it('builds the same seven complete steps in both languages', () => {
    for (const lang of ['en', 'es']) {
      const steps = buildTourSteps(translations[lang]);
      expect(steps).toHaveLength(7);
      for (const step of steps) {
        expect(step.id, 'step id').toBeTruthy();
        expect(step.title, `${step.id} title`).toBeTruthy();
        expect(step.body, `${step.id} body`).toBeTruthy();
      }
    }
  });
});
