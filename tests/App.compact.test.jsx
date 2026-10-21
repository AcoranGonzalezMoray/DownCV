import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import App from '../src/App';

const COMPACT = '(max-width: 1023px)';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('downcv_tour_done', 'true');

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query) => ({
      matches: query === COMPACT,
      addEventListener() {},
      removeEventListener() {},
    })),
  );
  document.fonts = { ready: Promise.resolve(), addEventListener() {}, removeEventListener() {} };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const drawer = () => screen.getByRole('dialog', { name: 'Actions' });
const menuButton = () => screen.getByTitle('Menu');

describe('the compact layout', () => {
  it('hides the bar of actions and offers the menu instead', () => {
    render(<App />);

    expect(menuButton()).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Actions' })).toBe(null);
  });

  it('keeps the switch of views in the middle of the bar', () => {
    render(<App />);

    const header = document.querySelector('header');
    expect(header.className).toMatch(/grid-cols-\[1fr_auto_1fr\]/);
  });

  it('gathers every action of the bar inside the drawer', () => {
    render(<App />);
    fireEvent.click(menuButton());

    const panel = within(drawer());
    for (const name of [
      'Commands',
      'AI Assistant',
      'Import CV',
      'Cover letter',
      'About & Privacy',
    ]) {
      expect(panel.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(panel.getAllByText('Styles').length).toBeGreaterThan(0);
    expect(panel.getAllByText('ATS Score').length).toBeGreaterThan(0);
    expect(panel.getAllByText('Versions').length).toBeGreaterThan(0);
  });

  it('opens the side panel of a tool and closes it again', () => {
    render(<App />);
    fireEvent.click(menuButton());
    fireEvent.click(within(drawer()).getByText('Styles'));

    expect(screen.queryByRole('dialog', { name: 'Actions' })).toBe(null);
    const panel = screen.getByRole('dialog', { name: 'Styles' });
    expect(within(panel).getByText('ATS Layout Presets')).toBeTruthy();

    fireEvent.click(within(panel).getByTitle('Close'));
    expect(screen.queryByRole('dialog', { name: 'Styles' })).toBe(null);
  });

  it('keeps the three views reachable from the compact bar', () => {
    render(<App />);

    fireEvent.click(screen.getByTitle('Editor'));
    expect(screen.queryByTitle('Split View')).toBeTruthy();
    expect(document.querySelector('.cv-page')).toBe(null);

    fireEvent.click(screen.getByTitle('Preview'));
    expect(document.querySelector('.cv-page')).toBeTruthy();
  });
});
