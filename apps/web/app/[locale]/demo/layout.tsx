import { DemoHeader } from '@/components/demo/demo-header'
import { getDemoFixtures } from '@/lib/demo/fixtures'
import { DemoProvider } from '@/lib/demo/store'

/**
 * Layout for the public `/demo` island. Unlike the dashboard and campaigns
 * layouts, it performs no auth: there is no signed-in user, no Supabase call,
 * and no protected chrome. It selects the route locale's sample-content
 * bundle and wraps every demo screen in the in-memory {@link DemoProvider}
 * (seeded from that bundle) and the public {@link DemoHeader}.
 *
 * @param {object} root0 - Layout props.
 * @param {React.ReactNode} root0.children - The demo page content.
 * @param {Promise<{ locale: string }>} root0.params - The route's locale param.
 * @returns {Promise<React.ReactElement>} The demo pages wrapped in the demo shell.
 */
export default async function DemoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const initialFixtures = getDemoFixtures(locale)

  return (
    // `key={locale}` forces a fresh DemoProvider on a locale switch. The store
    // seeds its state once (lazy `useState` + a `useRef`), so a soft navigation
    // that preserves the client component instance would otherwise keep the
    // previous locale's sample content even though the URL and chrome changed.
    // Re-keying guarantees the demo content re-seeds in the new language.
    <DemoProvider key={locale} initialFixtures={initialFixtures}>
      <DemoHeader />
      {children}
    </DemoProvider>
  )
}
