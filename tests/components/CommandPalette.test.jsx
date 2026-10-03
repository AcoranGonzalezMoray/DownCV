import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CommandPalette from '../../src/components/CommandPalette';
import { translations } from '../../src/data/translations';

const t = translations.en;


const allActions = () => ({
  theme: 'dark',
  lang: 'en',
  templateName: (id) => id,
  exportPdf: vi.fn(),
  exportDocx: vi.fn(),
  exportRtf: vi.fn(),
  exportPng: vi.fn(),
  exportJson: vi.fn(),
  exportPortfolio: vi.fn(),
  setViewMode: vi.fn(),
  setActiveSidebar: vi.fn(),
  fitToOnePage: vi.fn(),
  openAi: vi.fn(),
  retakeTour: vi.fn(),
  openImport: vi.fn(),
  openLetter: vi.fn(),
  saveDraft: vi.fn(),
  openLocalFile: vi.fn(),
  saveLocalFile: vi.fn(),
  toggleTheme: vi.fn(),
  setLang: vi.fn(),
  applyPreset: vi.fn(),
});

const open = (actions = allActions()) => {
  const onClose = vi.fn();
  const view = render(<CommandPalette open onClose={onClose} actions={actions} t={t} />);
  return { actions, onClose, view };
};

const input = () => screen.getByRole('textbox');
const options = () => screen.getAllByRole('button').filter((b) => b.dataset.selected !== undefined);

describe('CommandPalette', () => {
  afterEach(() => cleanup());

  it('draws nothing at all when it is closed', () => {
    render(<CommandPalette open={false} onClose={vi.fn()} actions={allActions()} t={t} />);
    expect(screen.queryByRole('dialog')).toBe(null);
  });

  it('lists every action of the app, exports and templates included', () => {
    open();
    const titles = options().map((option) => option.textContent);
    expect(titles.join(' ')).toMatch(/Export to PDF/);
    expect(titles.join(' ')).toMatch(/Word/);
    expect(titles.join(' ')).toMatch(/web portfolio/i);

    expect(titles.join(' ')).toMatch(/ats-classic/);
    expect(titles.join(' ')).toMatch(/minimal-clean/);
    expect(titles.join(' ')).toMatch(/versions panel/i);
    expect(titles.join(' ')).toMatch(/\.md file from disk/i);
  });

  it('runs the action and closes, rather than leaving the palette open', () => {
    const { actions, onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: /Export to PDF/ }));
    expect(actions.exportPdf).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('finds a command by the word anybody would use for it', () => {
    const { actions } = open();
    fireEvent.change(input(), { target: { value: 'portfolio' } });
    expect(options()).toHaveLength(1);
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(actions.exportPortfolio).toHaveBeenCalled();
  });

  it('takes the highlighted command with Enter', () => {
    const { actions } = open();
    fireEvent.change(input(), { target: { value: 'fit' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(actions.fitToOnePage).toHaveBeenCalled();
  });

  it('walks the list with the arrows and wraps around the ends', () => {
    open();
    const list = options();
    expect(list[0].dataset.selected).toBe('true');

    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(options()[1].dataset.selected).toBe('true');
    expect(options()[0].dataset.selected).toBe('false');

    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(options()[0].dataset.selected).toBe('true');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(options()[options().length - 1].dataset.selected).toBe('true');
  });

  it('never points the highlight past the end of a list that just got shorter', () => {
    open();
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.change(input(), { target: { value: 'zzzz' } });
    fireEvent.change(input(), { target: { value: 'fit' } });
    expect(options()).toHaveLength(1);
    expect(options()[0].dataset.selected).toBe('true');
  });

  it('closes on Escape without running anything', () => {
    const { actions, onClose } = open();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(actions.exportPdf).not.toHaveBeenCalled();
  });

  it('says so when nothing matches, instead of showing an empty box', () => {
    open();
    fireEvent.change(input(), { target: { value: 'qqqqqq' } });
    expect(screen.getByText(/No commands match/)).toBeTruthy();
  });

  it('names the language it is switching to, not the one it is in', () => {
    open();
    expect(screen.getByRole('button', { name: /Switch to Spanish/ })).toBeTruthy();
    const { actions } = open({ ...allActions(), lang: 'es' });
    expect(screen.getAllByRole('button', { name: /Switch to English/ })).toHaveLength(1);
    expect(actions.lang).toBe('es');
  });

  it('leaves out a command the app cannot do, rather than showing it broken', () => {
    const actions = allActions();
    delete actions.exportPortfolio;
    open(actions);
    expect(screen.queryByRole('button', { name: /web portfolio/i })).toBe(null);
  });

  it('replays the guided tour from the palette', () => {
    const { actions } = open();
    fireEvent.change(input(), { target: { value: 'tour' } });
    expect(options()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /guided tour/i }));
    expect(actions.retakeTour).toHaveBeenCalledTimes(1);
  });
});
