import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  coverage: {
    provider: 'v8',
    all: true,
    lines: 60,
    functions: 60,
    branches: 50,
    statements: 60,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
