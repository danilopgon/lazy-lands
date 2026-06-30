import { type NextRequest, NextResponse } from 'next/server'

import { decideAuth } from '@/lib/auth/decide'
import { updateSession } from '@/lib/supabase/middleware'

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[]
}

function splitCombinedSetCookieHeader(header: string | null) {
  if (!header) {
    return []
  }

  return header.split(/,(?=\s*[^;,\s]+=)/)
}

function copySetCookieHeaders(source: Headers, target: Headers) {
  const sourceWithSetCookie = source as HeadersWithSetCookie
  const explicitSetCookieHeaders = sourceWithSetCookie.getSetCookie?.() ?? []
  const setCookieHeaders = explicitSetCookieHeaders.length
    ? explicitSetCookieHeaders
    : splitCombinedSetCookieHeader(source.get('set-cookie'))

  for (const setCookie of setCookieHeaders) {
    target.append('set-cookie', setCookie.trim())
  }
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const pathname = new URL(request.url).pathname

  if (decideAuth(user, pathname) === 'redirect') {
    const redirect = NextResponse.redirect(new URL('/login', request.url), {
      status: 302,
    })

    copySetCookieHeaders(response.headers, redirect.headers)

    return redirect
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
