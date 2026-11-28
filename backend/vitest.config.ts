import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    // Every test file shares one Postgres database, so files run one after another.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
