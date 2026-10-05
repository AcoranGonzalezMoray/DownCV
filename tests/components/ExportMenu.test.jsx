import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ExportMenu from '../../src/components/ExportMenu';
import { translations } from '../../src/data/translations';

const t = translations.en;

const renderMenu = (props = {}) => {
  const onPdf = vi.fn(() => true);
  const onDocx = vi.fn(() => Promise.resolve(true));
  const onRtf = vi.fn(() => Promise.resolve(true));
  render(<ExportMenu t={t} onPdf={onPdf} onDocx={onDocx} onRtf={onRtf} {...props} />);
  return { onPdf, onDocx, onRtf };
};

const open = () => fireEvent.click(screen.getByRole('button', { name: /export/i }));

describe('ExportMenu', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('is a closed menu until it is asked for', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBe(null);
  });

  it('offers the three formats a portal asks for', () => {
    renderMenu();
    open();
    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('PDF'),
      expect.stringContaining('Word (.docx)'),
      expect.stringContaining('RTF'),
    ]);
  });

  it('prints through the PDF option and closes', async () => {
    const { onPdf } = renderMenu();
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /PDF/ }));
    expect(onPdf).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null));
  });

  it('waits for the Word document before it closes', async () => {
    let finish;
    const onDocx = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    renderMenu({ onDocx });
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Word/ }));
    expect(onDocx).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem').every((item) => item.disabled)).toBe(true);

    finish(true);
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null));
  });

  it('closes when the export guard holds the file back', async () => {
    const onRtf = vi.fn(() => false);
    renderMenu({ onRtf });
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /RTF/ }));
    expect(onRtf).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).toBe(null));
  });

  it('keeps the menu open and says what failed', async () => {
    const onDocx = vi.fn(() => Promise.reject(new Error('The document could not be built.')));
    renderMenu({ onDocx });
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Word/ }));
    await waitFor(() => expect(screen.getByText('The document could not be built.')).toBeTruthy());
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('closes on Escape and on a click outside, and not on a click inside', () => {
    renderMenu();
    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBe(null);

    open();
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBe(null);
  });
});
