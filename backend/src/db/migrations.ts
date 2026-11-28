import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client.js';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Applies every migration in backend/drizzle that has not run yet. Safe to call on every deploy. */
export async function runMigrations(db: Database) {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
