import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@/constants';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const TOKEN_KEY = 'mailpilot_api_token';

/** Backend session/API token. Stored in SecureStore only. Provider (Gmail) tokens never reach the app. */
export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; form?: FormData };
type Page<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };

function apiPath(path: string) {
  return path === '/health' ? path : `/api/v1${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function request(path: string, opts: Opts): Promise<{ response: Response; payload?: unknown }> {
  if (!API_URL) throw new ApiError('Backend URL is not configured. Set EXPO_PUBLIC_API_URL and restart the app.');
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${apiPath(path)}`, {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError('The request timed out while waiting for the backend.');
    throw new ApiError(`Cannot reach the backend at ${API_URL}. Check your network and the API URL.`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload: unknown = await response.json();
      if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') {
        message = payload.error.message;
      }
    } catch {
      // Keep the HTTP status message when the server does not return a JSON error.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return { response };
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return { response, payload: await response.json() };
  return { response, payload: await response.text() };
}

export async function http<T>(path: string, opts: Opts = {}): Promise<T> {
  const { response, payload } = await request(path, opts);
  if (response.status === 204) return undefined as T;
  if (isRecord(payload) && Object.prototype.hasOwnProperty.call(payload, 'data')) return payload.data as T;
  return payload as T;
}

export async function httpPage<T>(path: string): Promise<Page<T>> {
  const { payload } = await request(path, {});
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isRecord(payload.meta)) {
    throw new ApiError(`The backend returned an invalid paginated response for ${path}.`);
  }
  const { page, pageSize, total, totalPages } = payload.meta;
  if (![page, pageSize, total, totalPages].every((n) => typeof n === 'number')) {
    throw new ApiError(`The backend returned invalid pagination metadata for ${path}.`);
  }
  return {
    data: payload.data as T[],
    meta: { page, pageSize, total, totalPages } as Page<T>['meta'],
  };
}

export async function httpText(path: string): Promise<string> {
  const { payload } = await request(path, {});
  if (typeof payload !== 'string') throw new ApiError(`The backend returned an invalid text response for ${path}.`);
  return payload;
}
