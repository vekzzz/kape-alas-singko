import { createDatabase } from './db/client.js';
import { runMigrations } from './db/migrations.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const { db, pool } = createDatabase(env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL, { ssl: env.DATABASE_SSL });
try {
  await runMigrations(db);
  console.log('Database schema is up to date.');
} finally {
  await pool.end();
}
