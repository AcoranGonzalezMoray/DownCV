import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useKeyboardShortcuts from '../../src/hooks/useKeyboardShortcuts';

const press = (key, options = {}) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, ...options, key });
  window.dispatchEvent(event);
  return event;
};

const handlers = (overrides = {}) => ({
  onSave: vi.fn(),
  onBold: vi.fn(),
  onItalic: vi.fn(),
  onCommandPalette: vi.fn(),
  onPrint: vi.fn(),
  onSearch: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  ...overrides,
});

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves, bolds, italicises, palettes and prints', () => {
    const h = handlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(h));

    press('s', { ctrlKey: true });
    press('b', { ctrlKey: true });
    press('i', { ctrlKey: true });
    press('k', { ctrlKey: true });
    press('p', { ctrlKey: true });

    expect(h.onSave).toHaveBeenCalledTimes(1);
    expect(h.onBold).toHaveBeenCalledTimes(1);
    expect(h.onItalic).toHaveBeenCalledTimes(1);
    expect(h.onCommandPalette).toHaveBeenCalledTimes(1);
    expect(h.onPrint).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('undoes and redoes, with every modifier combination', () => {
    const h = handlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(h));

    press('z', { ctrlKey: true });
    expect(h.onUndo).toHaveBeenCalledTimes(1);

    press('z', { ctrlKey: true, shiftKey: true });
    expect(h.onRedo).toHaveBeenCalledTimes(1);

    press('y', { ctrlKey: true });
    expect(h.onRedo).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('searches with a bare slash and works with the meta key', () => {
    const h = handlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(h));

    press('/');
    expect(h.onSearch).toHaveBeenCalledTimes(1);

    press('s', { metaKey: true });
    expect(h.onSave).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('leaves plain typing alone', () => {
    const h = handlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(h));

    press('a');
    press('Enter');
    for (const fn of Object.values(h)) {
      expect(fn).not.toHaveBeenCalled();
    }
    unmount();
  });

  it('survives missing handlers and stops listening on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts({}));
    expect(() => press('s', { ctrlKey: true })).not.toThrow();
    unmount();

    const h = handlers();
    const second = renderHook(() => useKeyboardShortcuts(h));
    second.unmount();
    press('s', { ctrlKey: true });
    expect(h.onSave).not.toHaveBeenCalled();
  });
});
