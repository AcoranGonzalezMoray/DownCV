import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTheme from '../../src/hooks/useTheme';

const matchMedia = (matches) =>
  vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe('useTheme', () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('keeps the stored theme over the system one', () => {
    window.localStorage.setItem('downcv_theme', 'light');
    window.matchMedia = matchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('follows the system when nothing is stored', () => {
    window.matchMedia = matchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('falls back to dark when the stored value is garbage', () => {
    window.localStorage.setItem('downcv_theme', 'banana');
    window.matchMedia = matchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('toggles the theme and publishes it on the document', () => {
    window.matchMedia = matchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('downcv_theme')).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
  });

  it('follows the system live while nothing is stored', () => {
    let handler = null;
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn((event, fn) => {
        handler = fn;
      }),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    window.localStorage.removeItem('downcv_theme');
    act(() => {
      handler({ matches: true });
    });
    expect(result.current.theme).toBe('dark');
  });

  it('leaves a chosen theme alone when the system changes', () => {
    let handler = null;
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn((event, fn) => {
        handler = fn;
      }),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    act(() => {
      handler({ matches: false });
    });
    expect(window.localStorage.getItem('downcv_theme')).toBe('dark');
  });
});
