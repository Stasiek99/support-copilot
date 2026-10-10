import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/server.ts'],
      reporter: ['text-summary', 'text', 'lcov'],
      thresholds: { statements: 90, lines: 90, functions: 90, branches: 80 },
    },
  },
});
