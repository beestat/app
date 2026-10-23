import type { ApiCall } from '../types';

const runtimeConfig = window.__BEESTAT_CONFIG__ ?? {
  apiBase: '/api/',
  apiKey: import.meta.env.VITE_BEESTAT_API_KEY ?? '',
  environment: import.meta.env.MODE,
  isDemo: false,
  commit: 'dev',
};

export class ApiError extends Error {
  constructor(message: string, public readonly code?: number, public readonly detail?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function serialize(call: ApiCall) {
  return {
    resource: call.resource,
    method: call.method,
    arguments: JSON.stringify(call.arguments ?? {}),
    ...(call.alias ? { alias: call.alias } : {}),
    ...(call.bypass_cache_read ? { bypass_cache_read: true } : {}),
    ...(call.bypass_cache_write ? { bypass_cache_write: true } : {}),
    ...(call.clear_cache ? { clear_cache: true } : {}),
  };
}

export async function apiCall<T>(call: ApiCall, signal?: AbortSignal): Promise<T> {
  const response = await fetch(runtimeConfig.apiBase, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...serialize(call), api_key: runtimeConfig.apiKey }),
    signal,
  });
  return parseResponse<T>(response);
}

export async function apiBatch<T>(
  calls: ApiCall[],
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(runtimeConfig.apiBase, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: runtimeConfig.apiKey,
      batch: JSON.stringify(calls.map(serialize)),
    }),
    signal,
  });
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(`API request failed (${response.status})`, response.status);
  let payload: { success?: boolean; data?: T & { error_code?: number; error_message?: string } };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The API returned an invalid response.');
  }
  if (payload.success !== true) {
    throw new ApiError(
      payload.data?.error_message ?? 'API call failed.',
      payload.data?.error_code,
      payload.data,
    );
  }
  return payload.data as T;
}

export const config = runtimeConfig;
