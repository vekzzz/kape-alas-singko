import { createDatabase } from './db/client.js';
import { loadEnv } from './env.js';
import { seedDatabase } from './seed/seedDatabase.js';

const env = loadEnv();
const { db, pool } = createDatabase(env.DATABASE_URL, { ssl: env.DATABASE_SSL });
try {
  await seedDatabase(db);
  console.log('Menu and shop settings are seeded.');
} finally {
  await pool.end();
}
