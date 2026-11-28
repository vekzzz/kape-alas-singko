import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client.js';

/**
 * Finds backend/drizzle by walking up from this file. It sits two levels up from src/db when running from
 * source, and one level up from dist/ in the production bundle, so a fixed relative path would break one of them.
 */
export function findMigrationsFolder(from: string = dirname(fileURLToPath(import.meta.url))): string {
  let directory = from;
  for (let step = 0; step < 5; step++) {
    const candidate = join(directory, 'drizzle');
    if (existsSync(join(candidate, 'meta', '_journal.json'))) return candidate;
    directory = dirname(directory);
  }
  throw new Error(`Could not find the drizzle migrations folder above ${from}`);
}

/** Applies every migration in backend/drizzle that has not run yet. Safe to call on every start. */
export async function runMigrations(db: Database) {
  await migrate(db, { migrationsFolder: findMigrationsFolder() });
}
