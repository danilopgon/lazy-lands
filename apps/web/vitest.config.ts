import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: [
      'tests/**/*.test.{ts,tsx}',
      'app/**/__tests__/**/*.test.{ts,tsx}',
      'lib/**/__tests__/**/*.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    },
  },
})
