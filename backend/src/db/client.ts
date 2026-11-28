import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDatabase>['db'];

/**
 * `true` checks the server's certificate (what Neon and Render present). `'no-verify'` encrypts without
 * checking it, for a host with a self-signed certificate. `false` is no encryption, for local Postgres.
 */
export type SslMode = boolean | 'no-verify';

type Options = {
  ssl?: SslMode;
  /** Called when a connection that was sitting idle in the pool dies. Defaults to logging it. */
  onPoolError?: (error: Error) => void;
};

export function createDatabase(connectionString: string, { ssl = false, onPoolError }: Options = {}) {
  const pool = new pg.Pool({
    connectionString,
    ssl: ssl === 'no-verify' ? { rejectUnauthorized: false } : ssl ? true : undefined,
    // A small pool is plenty for one bar, and kind to a free database's connection limit.
    max: 5,
    idleTimeoutMillis: 10_000,
    // A database that has gone to sleep (Neon free) takes a few seconds to wake on the first connection.
    connectionTimeoutMillis: 15_000,
  });

  // Without a listener, one idle connection being dropped (a sleeping database does this) would crash the process.
  pool.on('error', (error) => (onPoolError ?? ((e) => console.error('An idle database connection failed:', e.message)))(error));

  const db = drizzle(pool, { schema });
  return { db, pool };
}

export { schema };
