import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  include: ['tests/**/*.test.ts'],
  testTimeout: 15000,
  hookTimeout: 30000,
  coverage: {
    reportsDirectory: 'coverage/report',
    provider: 'v8', include: ['src/**/*.ts'],
    reporter: ['text', 'json-summary', 'lcov', 'html'],
    thresholds: { lines: 80, branches: 70 }
  }
} });
