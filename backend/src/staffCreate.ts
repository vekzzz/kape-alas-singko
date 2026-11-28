import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createDatabase } from './db/client.js';
import { loadEnv } from './env.js';
import { StaffCreateError, createStaff } from './staff/createStaff.js';

/**
 * Creates a staff account:
 *   npm run staff:create -- --name "Ana" --email ana@example.com --role manager
 * It asks for the password, hidden, so it never lands in your shell history. (`--password` exists for scripts.)
 */

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string', default: 'barista' },
    password: { type: 'string' },
  },
});

function promptHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Stop readline echoing what is typed.
  (rl as unknown as { _writeToOutput: (text: string) => void })._writeToOutput = (text) => {
    if (text.includes('\n')) process.stdout.write('\n');
  };
  return new Promise((resolve) => rl.question('', (answer) => (rl.close(), resolve(answer))));
}

if (!values.name || !values.email) {
  console.error('Usage: npm run staff:create -- --name "Ana" --email ana@example.com [--role barista|manager]');
  process.exit(1);
}

const password = values.password ?? (await promptHidden('Password (at least 10 characters): '));
if (values.password === undefined) {
  const again = await promptHidden('Same password again: ');
  if (again !== password) {
    console.error('The passwords do not match.');
    process.exit(1);
  }
}

const env = loadEnv();
const { db, pool } = createDatabase(env.DATABASE_URL, { ssl: env.DATABASE_SSL });
try {
  const created = await createStaff(db, { name: values.name, email: values.email, password, role: values.role as 'barista' | 'manager' });
  console.log(`Created ${created.role} ${created.name} (${values.email.toLowerCase()}).`);
} catch (error) {
  if (error instanceof StaffCreateError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await pool.end();
}
