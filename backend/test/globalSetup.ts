import pg from 'pg';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrations.js';
import { TEST_DATABASE_URL } from './testDatabase.js';

/** Creates the test database if needed, wipes it, and applies every migration, once per test run. */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error(`Unsafe test database name: ${name}`);
  if (!name.includes('test')) throw new Error(`Refusing to wipe "${name}": the test database name must contain "test".`);

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(`Cannot reach Postgres for the tests (${adminUrl.host}). Run "npm run db:up" first.`, { cause: error });
  }
  const exists = await admin.query('select 1 from pg_database where datname = $1', [name]);
  if (exists.rowCount === 0) await admin.query(`create database "${name}"`);
  await admin.end();

  const { db, pool } = createDatabase(TEST_DATABASE_URL);
  await pool.query('drop schema if exists drizzle cascade');
  await pool.query('drop schema public cascade');
  await pool.query('create schema public');
  await runMigrations(db);
  await pool.end();
}
