import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDatabase>['db'];

export function createDatabase(connectionString: string, options: { ssl?: boolean } = {}) {
  const pool = new pg.Pool({
    connectionString,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export { schema };
