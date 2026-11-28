import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabase } from './client.js';
import { findMigrationsFolder } from './migrations.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('createDatabase', () => {
  const pools: { end: () => Promise<void> }[] = [];
  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
  });

  function open(options?: Parameters<typeof createDatabase>[1]) {
    const database = createDatabase('postgres://user:pass@localhost:5432/none', options);
    pools.push(database.pool);
    return database;
  }

  it('survives an idle connection dying, which a sleeping database causes', () => {
    const onPoolError = vi.fn();
    const { pool } = open({ onPoolError });

    // With no error listener, this would throw and take the whole process down.
    expect(() => pool.emit('error', new Error('Connection terminated unexpectedly'))).not.toThrow();
    expect(onPoolError).toHaveBeenCalledOnce();
  });

  it('logs the failure when no handler is given', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { pool } = open();
    pool.emit('error', new Error('boom'));
    expect(log).toHaveBeenCalledWith('An idle database connection failed:', 'boom');
    log.mockRestore();
  });

  it('uses a small pool and a patient connect timeout for a free, sleepy database', () => {
    const { pool } = open();
    const options = (pool as unknown as { options: { max: number; connectionTimeoutMillis: number } }).options;
    expect(options.max).toBe(5);
    expect(options.connectionTimeoutMillis).toBeGreaterThanOrEqual(10_000);
  });

  it('checks the certificate with ssl on, and skips the check only when asked to', () => {
    const ssl = (mode: Parameters<typeof createDatabase>[1]) => (open(mode).pool as unknown as { options: { ssl: unknown } }).options.ssl;
    expect(ssl({ ssl: false })).toBeUndefined();
    expect(ssl({ ssl: true })).toBe(true);
    expect(ssl({ ssl: 'no-verify' })).toEqual({ rejectUnauthorized: false });
  });
});

describe('findMigrationsFolder', () => {
  const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

  it('finds the folder from the source tree', () => {
    expect(findMigrationsFolder(join(backend, 'src', 'db'))).toBe(join(backend, 'drizzle'));
  });

  it('finds the same folder from the production bundle in dist/', () => {
    expect(findMigrationsFolder(join(backend, 'dist'))).toBe(join(backend, 'drizzle'));
  });

  it('says so when there is none', () => {
    expect(() => findMigrationsFolder(join(backend, '..', '..', '..'))).toThrow(/Could not find the drizzle migrations folder/);
  });
});
