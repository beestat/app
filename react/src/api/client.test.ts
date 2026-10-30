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

  it('sends the browser to log in when the session or ecobee access has ended', async () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { __BEESTAT_CONFIG__: { apiBase: '/api/', apiKey: '', environment: 'test', isDemo: false, commit: 'test' }, location: { assign } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, data: { error_code: 1505, error_message: 'Session is expired.' } }))));

    const { apiCall } = await import('./client');
    await expect(apiCall({ resource: 'user', method: 'read_id' })).rejects.toEqual(expect.objectContaining({ code: 1505 }));
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('keeps other API failures on the page', async () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { __BEESTAT_CONFIG__: { apiBase: '/api/', apiKey: '', environment: 'test', isDemo: false, commit: 'test' }, location: { assign } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, data: { error_code: 1004, error_message: 'Nope.' } }))));

    const { apiCall } = await import('./client');
    await expect(apiCall({ resource: 'user', method: 'read_id' })).rejects.toEqual(expect.objectContaining({ message: 'Nope.' }));
    expect(assign).not.toHaveBeenCalled();
  });
});
