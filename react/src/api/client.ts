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

const requestTimeoutMs = 60_000;

// Legacy beestat.api sends the browser back to the root (which handles log in) for these:
// expired session, and missing, unrefreshable, revoked or absent ecobee access.
const logOutErrorCodes = [1505, 10000, 10001, 10002, 10500, 10501];

async function postApi<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(runtimeConfig.apiBase, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (error) {
    if (timeout.aborted && !signal?.aborted) throw new ApiError('The API request timed out. Please try again.');
    throw error;
  }
  return parseResponse<T>(response);
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
  return postApi<T>({ ...serialize(call), api_key: runtimeConfig.apiKey }, signal);
}

export async function apiBatch<T>(
  calls: ApiCall[],
  signal?: AbortSignal,
): Promise<T> {
  return postApi<T>({
    api_key: runtimeConfig.apiKey,
    batch: JSON.stringify(calls.map(serialize)),
  }, signal);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(`API request failed (${response.status})`, response.status);
  let payload: { success?: boolean; data?: T & { error_code?: number; error_message?: string } };
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The API returned an invalid response.');
  }
  const errorCode = payload.data?.error_code;
  if (errorCode !== undefined && logOutErrorCodes.includes(Number(errorCode))) {
    window.location.assign('/');
    throw new ApiError('Your session has ended. Redirecting to log in…', errorCode, payload.data);
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
