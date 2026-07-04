import { type NextRequest, NextResponse } from 'next/server'

import { decideAuth } from '@/lib/auth/decide'
import { updateSession } from '@/lib/supabase/middleware'

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[]
}

/**
 * Split a combined Set-Cookie header string into individual cookie values.
 *
 * @param {string|null} header - The combined Set-Cookie header string, or null.
 * @returns {string[]} Array of individual cookie values, or empty array if header is null.
 */
function splitCombinedSetCookieHeader(header: string | null) {
  if (!header) {
    return []
  }

  return header.split(/,(?=\s*[^;,\s]+=)/)
}

/**
 * Copy Set-Cookie headers from a source response to a target, handling both combined and split formats.
 *
 * @param {Headers} source - The source response headers to read Set-Cookie from.
 * @param {Headers} target - The target headers object to append Set-Cookie values to.
 */
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

/**
 * Middleware entry — refresh the auth session and redirect unauthenticated users on protected routes.
 *
 * @param {NextRequest} request - The incoming Next.js request.
 * @returns {Promise<NextResponse>} The pass-through response, or a 302 redirect to /login for unauthenticated protected routes.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const pathname = new URL(request.url).pathname

  const decision = decideAuth(user, pathname)

  if (decision === 'redirectToDashboard') {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url), {
      status: 302,
    })

    copySetCookieHeaders(response.headers, redirect.headers)

    return redirect
  }

  if (decision === 'redirect') {
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
