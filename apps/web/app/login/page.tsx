import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SectionHeader } from '@/components/ui/section-header'

/**
 * Login page — placeholder until Supabase auth is implemented.
 *
 * @returns {React.ReactElement} The login page element.
 */
export default function LoginPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6 py-16"
    >
      <SectionHeader
        titleAs="h1"
        marker="/01"
        title="Return to the chronicle"
        description="Authentication is intentionally minimal in this scaffold. The finished login flow will protect private campaign data before any campaign routes expose content."
      />
      <Notice className="mt-8">
        The Scribe is waiting behind the gate. Supabase auth integration lands
        in the authentication implementation block; this route stays stable for
        navigation and smoke tests.
      </Notice>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/">Back to landing</Link>
        </Button>
        <Button asChild>
          <Link href="/register">Create account</Link>
        </Button>
      </div>
    </main>
  )
}
