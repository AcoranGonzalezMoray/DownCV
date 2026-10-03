import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLocalStorage from '../../src/hooks/useLocalStorage';

const KEY = 'test_hook_value';

describe('useLocalStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('starts with the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, []));
    expect(result.current[0]).toEqual([]);
  });

  it('reads back what a previous session stored', () => {
    window.localStorage.setItem('downcv_test_hook_value', JSON.stringify(['a']));
    const { result } = renderHook(() => useLocalStorage(KEY, []));
    expect(result.current[0]).toEqual(['a']);
  });

  it('persists every change under the prefixed key', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, []));
    act(() => {
      result.current[1](['a', 'b']);
    });
    expect(result.current[0]).toEqual(['a', 'b']);
    expect(JSON.parse(window.localStorage.getItem('downcv_test_hook_value'))).toEqual(['a', 'b']);
  });

  it('accepts an updater function', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 1));
    act(() => {
      result.current[1]((previous) => previous + 1);
    });
    expect(result.current[0]).toBe(2);
  });

  it('removes the stored value back to the initial one', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, []));
    act(() => {
      result.current[1](['a']);
    });
    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toEqual([]);
    expect(window.localStorage.getItem('downcv_test_hook_value')).toBe(null);
  });

  it('falls back to the initial value when the stored JSON is broken', () => {
    window.localStorage.setItem('downcv_test_hook_value', 'not-json{{{');
    const { result } = renderHook(() => useLocalStorage(KEY, 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});
