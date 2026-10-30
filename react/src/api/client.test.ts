import { afterEach, describe, expect, it, vi } from 'vitest';

describe('API client', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('turns a request timeout into an actionable API error', async () => {
    vi.stubGlobal('window', { __BEESTAT_CONFIG__: { apiBase: '/api/', apiKey: '', environment: 'test', isDemo: false, commit: 'test' } });
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')));
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => init.signal?.aborted
      ? Promise.reject(init.signal.reason)
      : new Promise(() => undefined)));

    const { apiCall } = await import('./client');
    const request = apiCall({ resource: 'user', method: 'read_id' });
    await expect(request).rejects.toEqual(expect.objectContaining({
      name: 'ApiError',
      message: 'The API request timed out. Please try again.',
    }));
  });
});
