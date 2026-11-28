import type { ApiError, ErrorCode } from '@kape/contract';
import type { ZodType, z } from 'zod';

export function errorBody(code: ErrorCode, message: string, extra: Partial<ApiError['error']> = {}): ApiError {
  return { error: { code, message, ...extra } };
}

/** Throw this from a route to answer with a status and the standard error shape. */
export class HttpError extends Error {
  readonly status: number;
  readonly body: ApiError;

  constructor(status: number, code: ErrorCode, message: string, extra: Partial<ApiError['error']> = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = errorBody(code, message, extra);
  }
}

/** Parses with a zod schema, or throws a 400 that names each field that is wrong. */
export function parseOrThrow<S extends ZodType>(schema: S, data: unknown, prefix = ''): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = [prefix, ...issue.path].filter((part) => part !== '').join('.') || 'body';
    fields[key] ??= issue.message;
  }
  throw new HttpError(400, 'VALIDATION', 'Some details need another look.', { fields });
}
