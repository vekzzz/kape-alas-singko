/** Where the API lives. Set VITE_API_URL at build time; in dev it defaults to the local backend. */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');

// The free API host sleeps when idle, so the first request after a quiet spell can take about 30 seconds.
const REQUEST_TIMEOUT_MS = 40_000;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** Anything with a `parse` that returns T, such as a zod schema from @kape/contract. */
type Parser<T> = { parse: (data: unknown) => T };

export async function apiGet<T>(path: string, schema: Parser<T>, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${API_URL}${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const error = body && typeof body === 'object' && 'error' in body ? (body as { error?: { code?: string; message?: string } }).error : undefined;
    throw new ApiRequestError(error?.message ?? `The server answered ${response.status}`, response.status, error?.code);
  }
  return schema.parse(await response.json());
}
