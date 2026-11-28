import { createDatabase } from '../src/db/client.js';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/kape_test';

/** A connection to the integration-test database, which `globalSetup` has already migrated. */
export function connectTestDatabase() {
  return createDatabase(TEST_DATABASE_URL);
}

const TABLES = [
  'order_item_options',
  'order_items',
  'order_status_events',
  'orders',
  'staff_sessions',
  'staff',
  'menu_item_option_groups',
  'menu_items',
  'option_values',
  'option_groups',
  'menu_groups',
  'shop_closures',
  'opening_hours',
  'shop_settings',
];

export async function emptyAllTables(pool: { query: (text: string) => Promise<unknown> }) {
  await pool.query(`TRUNCATE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

type PgError = { constraint?: string; code?: string };

/** Runs a query that should be rejected by the database and returns the name of the constraint that rejected it. */
export async function violatedConstraint(query: PromiseLike<unknown>): Promise<string> {
  try {
    await query;
  } catch (error) {
    const cause = ((error as { cause?: PgError }).cause ?? error) as PgError;
    return cause.constraint ?? cause.code ?? 'unknown';
  }
  throw new Error('Expected the database to reject the query, but it went through.');
}
