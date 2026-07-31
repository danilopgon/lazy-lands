import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'

import { isAppLocale, routing } from '@/i18n/routing'
import { decideAuth } from '@/lib/auth/decide'
import { buildLocalizedPath, stripLocaleFromPathname } from '@/lib/format'
import { updateSession } from '@/lib/supabase/middleware'

// `routing` is static, so build the i18n middleware once at module scope
// instead of recreating it on every request.
const handleI18nRouting = createMiddleware(routing)

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
  const i18nResponse = handleI18nRouting(request)
  const { response, user } = await updateSession(request, i18nResponse)

  const url = new URL(request.url)
  const { locale, pathname } = stripLocaleFromPathname(url.pathname)

  // Seed next-intl's `NEXT_LOCALE` cookie from the authenticated user's saved
  // language the first time we see them without one (e.g. a fresh sign-in on a
  // new device), so the authenticated experience starts in their preferred
  // language. Letting the cookie drive next-intl's own detection avoids both
  // redirect loops and the stale-read race of redirecting on async-written
  // `user_metadata`. Skip when the URL already carries an explicit locale
  // prefix (`pathname` differs from the raw path) — that is a deliberate
  // per-request choice that must win over the saved preference, so seeding the
  // cookie there would bounce e.g. `/en/dashboard` back to `/es/dashboard`.
  const hasExplicitLocalePrefix = url.pathname !== pathname
  const savedLanguage = user?.user_metadata?.language
  if (
    !hasExplicitLocalePrefix &&
    !request.cookies.has('NEXT_LOCALE') &&
    typeof savedLanguage === 'string' &&
    isAppLocale(savedLanguage)
  ) {
    response.cookies.set('NEXT_LOCALE', savedLanguage, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  }

  const decision = decideAuth(user, pathname)

  if (decision === 'redirectToDashboard') {
    const redirectUrl = new URL(
      buildLocalizedPath(`/dashboard${url.search}`, locale),
      request.url
    )
    const redirect = NextResponse.redirect(redirectUrl, {
      status: 302,
    })

    copySetCookieHeaders(response.headers, redirect.headers)

    return redirect
  }

  if (decision === 'redirect') {
    const redirectUrl = new URL(
      buildLocalizedPath(`/login${url.search}`, locale),
      request.url
    )
    const redirect = NextResponse.redirect(redirectUrl, {
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
//
// The root metadata routes are excluded because they are single, non-localized
// documents served from the app root. i18n routing would rewrite them into the
// locale segment (`/en/robots.txt`), where no route exists, and `as-needed`
// then bounces the default-locale prefix straight back — leaving crawlers a
// 404 at the exact well-known paths they look for.
export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
