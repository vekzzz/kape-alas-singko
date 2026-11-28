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

  it('reads the three database SSL modes', () => {
    const ssl = (value: string) => loadEnv({ DATABASE_URL: 'postgres://x', DATABASE_SSL: value }).DATABASE_SSL;
    expect(ssl('true')).toBe(true);
    expect(ssl('false')).toBe(false);
    expect(ssl('no-verify')).toBe('no-verify');
    expect(() => ssl('maybe')).toThrow(/DATABASE_SSL/);
  });

  it('has an optional direct database url for migrations', () => {
    expect(loadEnv({ DATABASE_URL: 'postgres://pooled' }).MIGRATION_DATABASE_URL).toBeUndefined();
    expect(loadEnv({ DATABASE_URL: 'postgres://pooled', MIGRATION_DATABASE_URL: 'postgres://direct' }).MIGRATION_DATABASE_URL).toBe('postgres://direct');
  });

  it('reads TRUST_PROXY as a switch that is off by default', () => {
    expect(loadEnv({ DATABASE_URL: 'postgres://x' }).TRUST_PROXY).toBe(false);
    expect(loadEnv({ DATABASE_URL: 'postgres://x', TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(true);
  });

  it('rejects a bad port', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgres://x', PORT: 'abc' })).toThrow(/PORT/);
  });
});
