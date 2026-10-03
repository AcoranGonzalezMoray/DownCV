import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useMarkdownHistory from '../../src/hooks/useMarkdownHistory';

describe('useMarkdownHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with the given value and no way back or forward', () => {
    const { result } = renderHook(() => useMarkdownHistory('# Ana'));
    expect(result.current.markdown).toBe('# Ana');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undoes and redoes a change', () => {
    const { result } = renderHook(() => useMarkdownHistory('# Ana'));
    act(() => {
      result.current.setMarkdown('# Ana\n\n## EXPERIENCE');
    });
    expect(result.current.markdown).toContain('EXPERIENCE');
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.markdown).toBe('# Ana');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.markdown).toContain('EXPERIENCE');
    expect(result.current.canRedo).toBe(false);
  });

  it('does nothing when there is no past or future', () => {
    const { result } = renderHook(() => useMarkdownHistory('# Ana'));
    act(() => {
      result.current.undo();
      result.current.redo();
    });
    expect(result.current.markdown).toBe('# Ana');
  });

  it('drops the redo stack when a new change arrives', () => {
    const { result } = renderHook(() => useMarkdownHistory('a'));
    act(() => {
      result.current.setMarkdown('b');
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.setMarkdown('c');
    });
    expect(result.current.markdown).toBe('c');
    expect(result.current.canRedo).toBe(false);
  });

  it('accepts an updater function and ignores identical values', () => {
    const { result } = renderHook(() => useMarkdownHistory('a'));
    act(() => {
      result.current.setMarkdown((previous) => `${previous}b`);
    });
    expect(result.current.markdown).toBe('ab');
    act(() => {
      result.current.setMarkdown('ab');
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.markdown).toBe('a');
  });

  it('collapses quick typing into a single undo step', () => {
    const { result } = renderHook(() => useMarkdownHistory(''));
    act(() => {
      result.current.setMarkdown('a', true);
    });
    vi.advanceTimersByTime(100);
    act(() => {
      result.current.setMarkdown('ab', true);
    });
    vi.advanceTimersByTime(100);
    act(() => {
      result.current.setMarkdown('abc', true);
    });
    expect(result.current.markdown).toBe('abc');
    act(() => {
      result.current.undo();
    });
    expect(result.current.markdown).toBe('');
    expect(result.current.canUndo).toBe(false);
  });

  it('keeps separate steps when the typing pauses', () => {
    const { result } = renderHook(() => useMarkdownHistory(''));
    act(() => {
      result.current.setMarkdown('a', true);
    });
    vi.advanceTimersByTime(1000);
    act(() => {
      result.current.setMarkdown('ab', true);
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.markdown).toBe('a');
    act(() => {
      result.current.undo();
    });
    expect(result.current.markdown).toBe('');
  });

  it('never keeps more than a hundred steps', () => {
    const { result } = renderHook(() => useMarkdownHistory('0'));
    for (let index = 1; index <= 120; index += 1) {
      act(() => {
        result.current.setMarkdown(String(index));
      });
    }
    let steps = 0;
    while (result.current.canUndo) {
      act(() => {
        result.current.undo();
      });
      steps += 1;
    }
    expect(steps).toBe(100);
  });
});
