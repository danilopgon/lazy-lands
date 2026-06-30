import { expect, test } from '@playwright/test'

// SM-E2E-01: Unauthenticated visit to a protected route redirects to /login.
//
// The proxy.ts (Next.js 16 middleware entry point) runs on every request,
// calls updateSession to refresh the Supabase cookie, then calls decideAuth.
// When no session cookie is present, user is null → decideAuth returns "redirect"
// → proxy returns NextResponse.redirect(..."/login").
//
// Note: this test requires `pnpm dev` to be running on port 3000.
test('SM-E2E-01: unauthenticated visit to /dashboard redirects to /login', async ({
  page,
}) => {
  // Clear all storage/cookies to ensure unauthenticated state
  await page.context().clearCookies()

  // Navigate to the protected route
  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  // Should land on /login (redirect from proxy)
  await expect(page).toHaveURL(/\/login/)
})
