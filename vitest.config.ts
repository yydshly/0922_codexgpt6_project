import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Browser QA profiles and other local caches must never be treated as project tests.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
