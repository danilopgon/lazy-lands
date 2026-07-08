import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/app-header'

/**
 * Layout for every `/campaigns/*` route — wraps them in the shared authenticated
 * chrome (new, review, detail, and the entity lists). The signed-in user is
 * resolved server-side (the middleware has already refreshed the session) and
 * only the derived identity reaches the bar.
 *
 * @param {object} root0 - Layout props.
 * @param {React.ReactNode} root0.children - The campaigns page content.
 * @returns {Promise<React.ReactElement>} The campaigns page wrapped in the app header.
 */
export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <AppHeader email={user?.email ?? null}>{children}</AppHeader>
}
