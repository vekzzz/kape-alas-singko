import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('fills in defaults', () => {
    const env = loadEnv({ DATABASE_URL: 'postgres://x' });
    expect(env).toMatchObject({ PORT: 3000, DATABASE_SSL: false, FRONTEND_ORIGIN: [], LOG_LEVEL: 'info' });
  });

  it('splits several frontend origins', () => {
    const env = loadEnv({ DATABASE_URL: 'postgres://x', FRONTEND_ORIGIN: 'https://a.example, https://b.example ' });
    expect(env.FRONTEND_ORIGIN).toEqual(['https://a.example', 'https://b.example']);
  });

  it('fails loudly when the database url is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a bad port', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgres://x', PORT: 'abc' })).toThrow(/PORT/);
  });
});
