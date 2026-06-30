import { type NextRequest, NextResponse } from 'next/server'

import { decideAuth } from '@/lib/auth/decide'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const pathname = new URL(request.url).pathname

  if (decideAuth(user, pathname) === 'redirect') {
    return NextResponse.redirect(new URL('/login', request.url), {
      status: 302,
    })
  }

  return response
}

// Broad matcher: covers every request except Next.js internals and static
// assets. This is intentional — Supabase SSR requires the middleware to run
// on ALL page requests so it can refresh the auth cookie transparently.
// Route protection is enforced by decideAuth (PROTECTED list), not the matcher.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
