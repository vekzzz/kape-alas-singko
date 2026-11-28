import { createApp } from './app.js';
import { createDatabase } from './db/client.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const { db, pool } = createDatabase(env.DATABASE_URL, { ssl: env.DATABASE_SSL });

const app = createApp({ db, frontendOrigins: env.FRONTEND_ORIGIN, logLevel: env.LOG_LEVEL, trustProxy: env.TRUST_PROXY });
const server = app.listen(env.PORT, () => console.log(`Kapé Alas-Singko API listening on :${env.PORT}`));

function shutdown() {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
