import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@testing-library/react': path.resolve(
        __dirname,
        'src/test-utils/testing-library-react.tsx',
      ),
      '@testing-library/user-event': path.resolve(
        __dirname,
        'src/test-utils/user-event.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
