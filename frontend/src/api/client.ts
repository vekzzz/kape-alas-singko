/** Where the API lives. Set VITE_API_URL at build time; in dev it defaults to the local backend. */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');

// The free API host sleeps when idle, so the first request after a quiet spell can take about 30 seconds.
const REQUEST_TIMEOUT_MS = 40_000;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  /** Extra facts that come with some errors, such as the new total after PRICE_CHANGED. */
  readonly details?: unknown;
  /** For a 400: which field was wrong and why. */
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, code?: string, extra: { details?: unknown; fields?: Record<string, string> } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = extra.details;
    this.fields = extra.fields;
  }
}

/** Anything with a `parse` that returns T, such as a zod schema from @kape/contract. */
type Parser<T> = { parse: (data: unknown) => T };

type RequestOptions = { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal };

async function request<T>(path: string, schema: Parser<T>, { method = 'GET', body, headers = {}, signal }: RequestOptions): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!response.ok) {
    const reply: unknown = await response.json().catch(() => null);
    const error = reply && typeof reply === 'object' && 'error' in reply ? (reply as { error?: { code?: string; message?: string; details?: unknown; fields?: Record<string, string> } }).error : undefined;
    throw new ApiRequestError(error?.message ?? `The server answered ${response.status}`, response.status, error?.code, { details: error?.details, fields: error?.fields });
  }
  return schema.parse(await response.json());
}

export function apiGet<T>(path: string, schema: Parser<T>, signal?: AbortSignal): Promise<T> {
  return request(path, schema, { signal });
}

/** `body` is sent as JSON. Pass `Idempotency-Key` in `headers` for anything that creates something. */
export function apiPost<T>(path: string, schema: Parser<T>, body?: unknown, headers?: Record<string, string>): Promise<T> {
  return request(path, schema, { method: 'POST', body: body ?? {}, headers });
}
