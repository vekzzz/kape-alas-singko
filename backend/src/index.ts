import { createApp } from './app.js';
import { pool } from './db.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)');
if (!process.env.STAFF_TOKEN) console.warn('STAFF_TOKEN is not set: staff routes will reject every request.');

const app = createApp({ pool, staffToken: process.env.STAFF_TOKEN, frontendOrigin: process.env.FRONTEND_ORIGIN });
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Kapé Alas-Singko API listening on :${port}`));
