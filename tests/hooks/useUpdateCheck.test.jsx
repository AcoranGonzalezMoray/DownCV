import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { BEHIND, CURRENT, DISMISS_KEY, UNKNOWN } from '../../src/data/versionInfo';

const behindResult = {
  status: BEHIND,
  aheadBy: 2,
  behindBy: 0,
  compareUrl: 'https://github.com/x',
  commits: [{ sha: 'aaaaaaa', message: 'Fix it', author: 'Acora', date: '' }],
};

const loadHook = async () => {
  const { default: useCheck } = await import('../../src/hooks/useUpdateCheck');
  return useCheck;
};

describe('useUpdateCheck', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the modal on start when main has moved ahead', async () => {
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: vi.fn(async () => behindResult),
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));
    expect(result.current.updateInfo.aheadBy).toBe(2);
    expect(result.current.currentSha).toBe('aaa1111');
  });

  it('stays quiet when the build is already up to date', async () => {
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: vi.fn(async () => ({ status: CURRENT, behindBy: 0, commits: [] })),
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.isOpen).toBe(false);
  });

  it('stays quiet when GitHub cannot be reached', async () => {
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: vi.fn(async () => ({ status: UNKNOWN, reason: 'offline' })),
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.isOpen).toBe(false);
  });

  it('does not check again after the user skips', async () => {
    window.sessionStorage.setItem(DISMISS_KEY, 'true');
    const check = vi.fn(async () => behindResult);
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    renderHook(() => useCheck());
    await Promise.resolve();
    expect(check).not.toHaveBeenCalled();
  });

  it('remembers the skip so a reload does not reopen the modal', async () => {
    const check = vi.fn(async () => behindResult);
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.isOpen).toBe(false);
    expect(window.sessionStorage.getItem(DISMISS_KEY)).toBe('true');
  });

  it('asks the dev server for a pull and reloads on success', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, message: 'done' }) }));
    vi.stubGlobal('fetch', fetchMock);

    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => true,
        checkForUpdates: vi.fn(async () => behindResult),
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    await act(async () => {
      await result.current.update();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/git-pull', { method: 'POST' });
    expect(reload).toHaveBeenCalled();
    expect(result.current.updateError).toBe('');
  });

  it('keeps the error visible when the pull is refused', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ ok: false, error: 'dirty', message: 'uncommitted changes' }),
      })),
    );

    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => true,
        checkForUpdates: vi.fn(async () => behindResult),
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    await act(async () => {
      await result.current.update();
    });
    expect(result.current.updateError).toBe('uncommitted changes');
    expect(reload).not.toHaveBeenCalled();
  });

  it('never touches git outside dev, it only points at the terminal', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: vi.fn(async () => behindResult),
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    await act(async () => {
      await result.current.update();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never reaches the network when the build carries no commit', async () => {
    const check = vi.fn(async () => behindResult);
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => '',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(check).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentSha).toBe('');
  });

  it('keeps the badge lit after the dialog was skipped', async () => {
    const check = vi.fn(async () => behindResult);
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));
    expect(result.current.isOutdated).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isOutdated).toBe(true);
  });

  it('asks GitHub again when the badge is clicked', async () => {
    const check = vi.fn(async () => behindResult);
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));
    act(() => result.current.dismiss());
    check.mockClear();

    await act(async () => {
      await result.current.reveal();
    });
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
    expect(result.current.isOpen).toBe(true);
  });

  it('confirms the update once main has caught up, instead of vanishing', async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(behindResult)
      .mockResolvedValue({ status: CURRENT, aheadBy: 0, behindBy: 0, commits: [] });
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOutdated).toBe(true));
    act(() => result.current.dismiss());

    await act(async () => {
      await result.current.reveal();
    });
    expect(result.current.isOutdated).toBe(false);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.resolved).toEqual({ previousCount: 2 });

    act(() => result.current.dismiss());
    expect(result.current.resolved).toBe(null);
    expect(result.current.isOpen).toBe(false);
  });

  it('brings the badge back after a reload, even when the dialog was skipped', async () => {
    const check = vi.fn(async () => behindResult);
    const mockVersion = async () => {
      const actual = await vi.importActual('../../src/utils/versionCheck');
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    };

    vi.doMock('../../src/utils/versionCheck', mockVersion);
    const useCheck = await loadHook();
    const first = renderHook(() => useCheck());
    await waitFor(() => expect(first.result.current.isOpen).toBe(true));
    act(() => first.result.current.dismiss());
    first.unmount();

    vi.resetModules();
    check.mockClear();
    vi.doMock('../../src/utils/versionCheck', mockVersion);
    const useReloaded = await loadHook();

    const second = renderHook(() => useReloaded());
    expect(second.result.current.isOutdated).toBe(true);
    expect(second.result.current.updateInfo.aheadBy).toBe(2);
    expect(second.result.current.isOpen).toBe(false);
    expect(check).not.toHaveBeenCalled();
  });

  it('reopens on a manual check even after the user skipped', async () => {
    const check = vi.fn(async () => behindResult);
    vi.doMock('../../src/utils/versionCheck', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        runningSha: () => 'aaa1111',
        runningInDev: () => false,
        checkForUpdates: check,
      };
    });
    const useCheck = await loadHook();

    const { result } = renderHook(() => useCheck());
    await waitFor(() => expect(result.current.isOpen).toBe(true));
    act(() => result.current.dismiss());

    await act(async () => {
      await result.current.checkNow(true);
    });
    expect(check).toHaveBeenCalledTimes(2);
    expect(result.current.isOpen).toBe(true);
  });
});