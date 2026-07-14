import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm exec next dev --port 3001',
    env: {
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4010',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'visual-regression-key',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      VISUAL_REGRESSION_TEST_MODE: 'true',
    },
    port: 3001,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
