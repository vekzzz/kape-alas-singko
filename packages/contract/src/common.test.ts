import { describe, expect, it } from 'vitest';
import { apiErrorSchema, orderStatusSchema, phoneSchema } from './index.js';

describe('contract basics', () => {
  it('knows the cancelled status', () => {
    expect(orderStatusSchema.parse('cancelled')).toBe('cancelled');
    expect(orderStatusSchema.safeParse('lost').success).toBe(false);
  });

  it('accepts only normalized phone numbers', () => {
    expect(phoneSchema.safeParse('09171234567').success).toBe(true);
    expect(phoneSchema.safeParse('+639171234567').success).toBe(false);
  });

  it('parses the error shape', () => {
    const parsed = apiErrorSchema.parse({ error: { code: 'PRICE_CHANGED', message: 'Prices changed.' } });
    expect(parsed.error.code).toBe('PRICE_CHANGED');
  });
});
