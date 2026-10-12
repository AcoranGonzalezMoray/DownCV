import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkForUpdates,
  clearSession,
  compareUrlFor,
  markDismissed,
  parseCompare,
  readCache,
  runningCommitDate,
  runningInDev,
  runningSha,
  updateAvailable,
  wasDismissed,
  writeCache,
} from '../../src/utils/versionCheck';
import {
  BEHIND,
  CACHE_KEY,
  CHECK_INTERVAL_MS,
  CURRENT,
  DISMISS_KEY,
  UNKNOWN,
  UPDATE_COMMAND,
} from '../../src/data/versionInfo';

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

const behindPayload = {
  status: 'behind',
  ahead_by: 2,
  behind_by: 0,
  html_url: 'https://github.com/AcoranGonzalezMoray/DownCV/compare/aaa...main',
  commits: [
    {
      sha: 'aaaaaaabbbb',
      commit: { message: 'Fix the ATS parser\n\nlong body', author: { name: 'Acora', date: '2026-01-02T10:00:00Z' } },
    },
    { sha: 'cccccccdddd', commit: { message: 'Add docker support', author: { name: 'Acora' } } },
  ],
};

describe('versionCheck', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the build-time commit injected by Vite, empty outside a build', () => {
    expect(runningSha()).toBe('');
    expect(runningCommitDate()).toBe('');
    expect(runningInDev()).toBe(false);
  });

  it('builds the compare URL with and without a commit', () => {
    expect(compareUrlFor('abc1234')).toBe(
      'https://github.com/AcoranGonzalezMoray/DownCV/compare/abc1234...main',
    );
    expect(compareUrlFor()).toContain('/commits/main');
  });

  it('turns a main-ahead response into a commit preview', () => {
    const parsed = parseCompare(behindPayload);
    expect(parsed.status).toBe(BEHIND);
    expect(parsed.aheadBy).toBe(2);
    expect(parsed.commits).toHaveLength(2);
    expect(parsed.commits[0]).toEqual({
      sha: 'aaaaaaa',
      message: 'Fix the ATS parser',
      author: 'Acora',
      date: '2026-01-02T10:00:00Z',
    });
    expect(parsed.commits[1].date).toBe('');
  });

  it('reports an identical build as up to date', () => {
    expect(parseCompare({ status: 'identical' })).toMatchObject({
      status: CURRENT,
      aheadBy: 0,
      commits: [],
    });
  });

  it('stays silent for a branch that runs ahead of main', () => {
    const parsed = parseCompare({ status: 'behind', ahead_by: 0, behind_by: 1, commits: [{}] });
    expect(parsed.status).toBe(CURRENT);
    expect(parsed.aheadBy).toBe(0);
    expect(parsed.behindBy).toBe(1);
    expect(parsed.commits).toEqual([]);
    expect(updateAvailable(parsed)).toBe(false);
  });

  it('only counts a positive gap as an available update', () => {
    expect(updateAvailable(parseCompare(behindPayload))).toBe(true);
    expect(updateAvailable({ status: BEHIND, aheadBy: 0 })).toBe(false);
    expect(updateAvailable({ status: CURRENT })).toBe(false);
    expect(updateAvailable(null)).toBe(false);
  });

  it('asks GitHub how far main has moved ahead of the running commit', async () => {
    const fetchImpl = vi.fn(async () => okResponse(behindPayload));
    const result = await checkForUpdates({ sha: 'aaa', force: true, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      'https://api.github.com/repos/AcoranGonzalezMoray/DownCV/compare/aaa...main',
    );
    expect(result.status).toBe(BEHIND);
    expect(result.aheadBy).toBe(2);
  });

  it('gives up quietly when there is no embedded commit', async () => {
    const fetchImpl = vi.fn();
    const result = await checkForUpdates({ force: true, fetchImpl });
    expect(result).toEqual({ status: UNKNOWN, reason: 'no-version' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('keeps the stored commit out of reach of a different build', () => {
    expect(runningSha()).toBe('');
    expect(compareUrlFor('')).not.toContain('undefined');
    expect(compareUrlFor(undefined)).toContain('/commits/main');
  });

  it('swallows rate limits and network failures instead of throwing', async () => {
    const limited = await checkForUpdates({
      sha: 'aaa',
      force: true,
      fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }),
    });
    expect(limited).toEqual({ status: UNKNOWN, reason: 'rate-limit' });

    const broken = await checkForUpdates({
      sha: 'aaa',
      force: true,
      fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    });
    expect(broken).toEqual({ status: UNKNOWN, reason: 'http-500' });

    const offline = await checkForUpdates({
      sha: 'aaa',
      force: true,
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    expect(offline).toEqual({ status: UNKNOWN, reason: 'offline' });
  });

  it('reuses the cached answer within the interval and refetches after it', async () => {
    const start = 1_000_000;
    const fetchImpl = vi.fn(async () => okResponse(behindPayload));

    await checkForUpdates({ sha: 'aaa', force: true, now: start, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await checkForUpdates({ sha: 'aaa', now: start + CHECK_INTERVAL_MS - 1, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await checkForUpdates({ sha: 'aaa', now: start + CHECK_INTERVAL_MS + 1, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('ignores a cache entry written for a different commit', () => {
    writeCache('aaa', { status: BEHIND, behindBy: 3, commits: [] }, 1_000_000);
    expect(readCache('aaa', 1_000_000)).toMatchObject({ behindBy: 3 });
    expect(readCache('bbb', 1_000_000)).toBe(null);
    expect(readCache('aaa', 1_000_000 + CHECK_INTERVAL_MS)).toBe(null);
    expect(readCache('aaa', 1_000_000)).not.toBe(null);
  });

  it('does not cache an unknown result', async () => {
    await checkForUpdates({
      sha: 'aaa',
      force: true,
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    expect(readCache('aaa', Date.now())).toBe(null);
  });

  it('survives a corrupted cache payload', () => {
    window.sessionStorage.setItem(CACHE_KEY, '{not json');
    expect(readCache('aaa')).toBe(null);
  });

  it('hands out a command that runs the same on Windows, macOS and Linux', () => {
    expect(UPDATE_COMMAND).toBe('git pull && npm run docker:up');
    expect(UPDATE_COMMAND).not.toMatch(/\$\(/);
  });

  it('remembers a skip for the rest of the session', () => {
    expect(wasDismissed()).toBe(false);
    markDismissed();
    expect(wasDismissed()).toBe(true);
    expect(window.sessionStorage.getItem(DISMISS_KEY)).toBe('true');
    clearSession(DISMISS_KEY);
    expect(wasDismissed()).toBe(false);
  });
});