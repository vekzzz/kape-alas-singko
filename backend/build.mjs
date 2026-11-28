// Builds the API for production: plain JavaScript in dist/, run with `node dist/index.js`.
//
// The shared @kape/contract package is TypeScript source, so it is bundled in. Everything else the API
// depends on (express, pg, drizzle, zod, argon2...) stays an ordinary import from node_modules.
import { readFile, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const { dependencies } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(dependencies).filter((name) => name !== '@kape/contract');

await rm(new URL('./dist', import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: ['src/index.ts', 'src/migrate.ts', 'src/seed.ts', 'src/staffCreate.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  external,
  logLevel: 'info',
});
