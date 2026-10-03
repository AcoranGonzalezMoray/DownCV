import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sw = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

describe('the service worker', () => {
  it('asks the network first for the shell, and only falls back to the cache', () => {
    
    expect(sw).toMatch(/async function networkFirst/);
    expect(sw).toMatch(/networkFirst\(request\)/);

    expect(sw).not.toMatch(/cached \|\| fetch\(request\)/);
  });

  it('revalidates the hashed assets in the background instead of holding them', () => {
    
    expect(sw).toMatch(/staleWhileRevalidate/);
    expect(sw).toMatch(/url\.pathname\.startsWith\('\/assets\/'\)/);
  });

  it('names its cache after the shell it holds, so a new one replaces it', () => {
    const names = [...sw.matchAll(/CACHE_NAME = '([^']+)'/g)].map((match) => match[1]);
    expect(names).toHaveLength(1);
    expect(names[0]).not.toBe('downcv-v2.0');

    expect(sw).toMatch(/keys\.filter\(\(key\) => key !== CACHE_NAME\)/);
    expect(sw).toMatch(/clients\.claim\(\)/);
  });

  it('installs even when one of the assets cannot be fetched', () => {
    
    expect(sw).toMatch(/Promise\.allSettled/);
  });

  it('leaves other people`s assets alone', () => {
    expect(sw).toMatch(/url\.origin !== self\.location\.origin/);
  });

  describe('running it', () => {
    let handlers;
    let cachesMock;
    let fetchMock;
    let fakeSelf;

    beforeEach(() => {
      handlers = {};
      cachesMock = {
        open: vi.fn(async () => ({
          add: vi.fn(async () => {}),
          put: vi.fn(async () => {}),
          match: vi.fn(async () => undefined),
        })),
        match: vi.fn(async () => undefined),
        keys: vi.fn(async () => ['downcv-shell-v3', 'downcv-v2.0']),
        delete: vi.fn(async () => true),
      };
      fetchMock = vi.fn(async () => ({ ok: true, clone: () => ({}) }));
      fakeSelf = {
        location: { origin: 'https://downcv.test' },
        skipWaiting: vi.fn(),
        clients: { claim: vi.fn(async () => {}) },
        addEventListener: (type, handler) => {
          handlers[type] = handler;
        },
      };
      vi.stubGlobal('caches', cachesMock);
      vi.stubGlobal('fetch', fetchMock);
      vi.stubGlobal('self', fakeSelf);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    const load = async () => {

      new Function('self', 'caches', 'fetch', 'Response', 'URL', sw)(
        fakeSelf,
        cachesMock,
        fetchMock,
        { error: () => ({ error: true }) },
        URL,
      );
      return handlers;
    };

    it('takes over from the old cache and claims the open pages', async () => {
      const { activate } = await load();
      
      let pending;
      activate({
        waitUntil: (promise) => {
          pending = promise;
        },
      });
      await pending;

      expect(cachesMock.delete).toHaveBeenCalledWith('downcv-v2.0');
      expect(fakeSelf.clients.claim).toHaveBeenCalled();
    });

    it('serves a fresh shell from the network when there is one', async () => {
      const { fetch: onFetch } = await load();
      const event = {
        request: {
          method: 'GET',
          mode: 'navigate',
          url: 'https://downcv.test/',
          headers: new Map([['accept', 'text/html']]),
        },
        respondWith: vi.fn(),
      };
      onFetch(event);

      await event.respondWith.mock.calls[0][0];
      expect(fetchMock).toHaveBeenCalled();
    });

    it('still opens the app with no network at all', async () => {
      cachesMock.match = vi.fn(async () => ({ ok: true, fromCache: true }));
      fetchMock.mockRejectedValue(new Error('offline'));
      const { fetch: onFetch } = await load();
      const event = {
        request: {
          method: 'GET',
          mode: 'navigate',
          url: 'https://downcv.test/',
          headers: new Map([['accept', 'text/html']]),
        },
        respondWith: vi.fn(),
      };
      onFetch(event);

      const response = await event.respondWith.mock.calls[0][0];
      expect(response.fromCache).toBe(true);
    });
  });
});
