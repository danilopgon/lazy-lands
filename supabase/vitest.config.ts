import { defineConfig } from 'vitest/config'

// Vitest config scoped to the `supabase` workspace.
// Covers seed/tooling scripts under `supabase/scripts/`. Node environment
// (these scripts are CLI tools, not browser code).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
  },
})
