import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import React from 'react';
import AtsRobotView from '../../src/components/AtsRobotView';
import { translations } from '../../src/data/translations';

const t = translations.en;

const record = {
  charCount: 120,
  pageTexts: [
    'Ana Gomez\nana@mail.com\n+34 600 000 000\n\nEXPERIENCIA\nAcme Corp\nLed the migration that cut deploys by 45%',
    'Ana G?mez\nana@mail.com\n\nEDUCACI?N\nBSc Computer Science\nIncidencias: 30% menos',
  ],
};

const renderView = (overrides = {}) =>
  render(<AtsRobotView record={{ ...record, ...overrides }} t={t} />);

describe('AtsRobotView', () => {
  afterEach(() => cleanup());

  it('draws nothing without an evaluation, because there is nothing to show', () => {
    const { container } = render(<AtsRobotView record={null} t={t} />);
    expect(container.textContent).toBe('');
  });

  it('stays closed until it is asked for, so the panel is not a wall of text', () => {
    renderView();
    expect(screen.queryByText(/Ana Gomez/)).toBe(null);
    expect(screen.getByText(/What the robot read/)).toBeTruthy();
  });

  it('shows the extracted text of each page, page by page', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));

    expect(screen.getByText(/Ana Gomez/)).toBeTruthy();
    expect(screen.getByText(/Led the migration/)).toBeTruthy();
    
    expect(screen.getByText(/BSc Computer Science/)).toBeTruthy();
    expect(screen.getAllByText(/Page/).length).toBeGreaterThan(0);
  });

  it('counts the lines of each page, so an empty one is visible', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));
    expect(screen.getByText(/\(5 lines\)/)).toBeTruthy();
  });

  it('can narrow the dump to the lines a parser reads badly', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /reads badly/i }));


    expect(screen.queryByText(/^Ana Gomez$/m)).toBe(null);
    expect(screen.getByText(/Ana G\?mez/)).toBeTruthy();
    expect(screen.getByText(/EDUCACI\?N/)).toBeTruthy();
  });

  it('says a page is empty rather than showing an empty box', () => {
    render(<AtsRobotView record={{ ...record, pageTexts: ['a line', ''] }} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));
    expect(screen.getByText(/Nothing readable on this page/)).toBeTruthy();
  });

  it('falls back to the whole text when the pages were never stored', () => {
    render(<AtsRobotView record={{ charCount: 10, text: 'one single blob' }} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));
    expect(screen.getByText(/one single blob/)).toBeTruthy();
  });

  it('puts the extracted text on the clipboard, page breaks included', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy the extracted text/ }));
    });

    expect(writeText).toHaveBeenCalledWith(record.pageTexts.join('\n\n'));
  });

  it('keeps quiet when the clipboard is not there, instead of throwing', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error('no clipboard');
        }),
      },
    });
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /What the robot read/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy the extracted text/ }));
    });
  });
});
