import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import AiRewritePopover from '../../src/components/AiRewritePopover';
import { translations } from '../../src/data/translations';

const t = translations.en;

const props = (overrides = {}) => ({
  anchor: { top: 100, left: 120 },
  original: 'Worked on the web app',
  options: ['Engineered the web application, improving performance by 25%'],
  loading: false,
  error: null,
  t,
  onPick: vi.fn(),
  onGenerate: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe('AiRewritePopover', () => {
  afterEach(() => cleanup());

  it('floats next to the selection with the original and the options', () => {
    render(<AiRewritePopover {...props()} />);
    expect(screen.getByRole('dialog', { name: t.aiRewriteTitle })).toBeTruthy();
    expect(screen.getByText(/Worked on the web app/)).toBeTruthy();
    expect(screen.getByText(/Engineered the web application/)).toBeTruthy();
  });

  it('applies the option that is picked', () => {
    const all = props();
    render(<AiRewritePopover {...all} />);
    fireEvent.click(screen.getByText(/Engineered the web application/));
    expect(all.onPick).toHaveBeenCalledWith(all.options[0]);
  });

  it('asks the local model for one more option', () => {
    const all = props();
    render(<AiRewritePopover {...all} />);
    fireEvent.click(screen.getByRole('button', { name: t.aiRewriteGenerate }));
    expect(all.onGenerate).toHaveBeenCalledTimes(1);
  });

  it('says it is generating and says when the model failed', () => {
    const { unmount } = render(<AiRewritePopover {...props({ loading: true })} />);
    expect(screen.getByText(t.aiRewriteGenerating)).toBeTruthy();
    unmount();
    cleanup();
    render(<AiRewritePopover {...props({ error: 'fetch failed' })} />);
    expect(screen.getByText('fetch failed')).toBeTruthy();
  });

  it('admits when there is nothing local to offer', () => {
    render(<AiRewritePopover {...props({ options: [] })} />);
    expect(screen.getByText(t.aiRewriteEmpty)).toBeTruthy();
  });

  it('closes through the X button and the Escape key', () => {
    const all = props();
    render(<AiRewritePopover {...all} />);
    fireEvent.click(screen.getByRole('button', { name: t.cancel }));
    expect(all.onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(all.onClose).toHaveBeenCalledTimes(2);
  });

  it('stays out of the printed page', () => {
    const { container } = render(<AiRewritePopover {...props()} />);
    expect(container.firstChild.className).toMatch(/no-print/);
  });

  it('moves with the header and drops where it is left', () => {
    window.PointerEvent = window.MouseEvent;
    render(<AiRewritePopover {...props()} />);
    const header = screen.getByTitle(t.aiRewriteTitle);
    const dialog = screen.getByRole('dialog', { name: t.aiRewriteTitle });

    fireEvent.pointerDown(header, { pointerId: 1, button: 0, clientX: 130, clientY: 110 });
    fireEvent.pointerMove(header, { pointerId: 1, clientX: 200, clientY: 180 });
    expect(dialog.style.left).toBe('190px');
    expect(dialog.style.top).toBe('170px');

    fireEvent.pointerUp(header, { pointerId: 1, clientX: 200, clientY: 180 });
    fireEvent.pointerMove(header, { pointerId: 1, clientX: 400, clientY: 400 });
    expect(dialog.style.left).toBe('190px');
    expect(dialog.style.top).toBe('170px');
    delete window.PointerEvent;
  });

  it('never leaves the viewport while dragged', () => {
    window.PointerEvent = window.MouseEvent;
    render(<AiRewritePopover {...props()} />);
    const header = screen.getByTitle(t.aiRewriteTitle);
    const dialog = screen.getByRole('dialog', { name: t.aiRewriteTitle });

    fireEvent.pointerDown(header, { pointerId: 1, button: 0, clientX: 130, clientY: 110 });
    fireEvent.pointerMove(header, { pointerId: 1, clientX: -500, clientY: -500 });
    expect(dialog.style.left).toBe('8px');
    expect(dialog.style.top).toBe('8px');
    delete window.PointerEvent;
  });

  it('ignores drags that do not start with the primary button', () => {
    window.PointerEvent = window.MouseEvent;
    render(<AiRewritePopover {...props()} />);
    const header = screen.getByTitle(t.aiRewriteTitle);
    const dialog = screen.getByRole('dialog', { name: t.aiRewriteTitle });

    fireEvent.pointerDown(header, { pointerId: 1, button: 2, clientX: 130, clientY: 110 });
    fireEvent.pointerMove(header, { pointerId: 1, clientX: 400, clientY: 400 });
    expect(dialog.style.left).toBe('120px');
    expect(dialog.style.top).toBe('100px');
    delete window.PointerEvent;
  });
});
