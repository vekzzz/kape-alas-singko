import { randomBytes, randomInt } from 'node:crypto';

/** Easy to say and read aloud at a counter: no 0/O, 1/I/L, 2/Z, 5/S, 8/B. */
const ORDER_ALPHABET = 'ACDEFGHJKMNPRTVWXY34679';

/** A short number such as A5-K7P. Only unique within one business day, so callers retry on a clash. */
export function generateOrderNumber(prefix: string): string {
  let code = '';
  for (let i = 0; i < 3; i++) code += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return `${prefix}${code}`;
}

/** 128 random bits, base64url: the unguessable id customers and staff use in URLs. */
export function generatePublicId(): string {
  return randomBytes(16).toString('base64url');
}

export const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
