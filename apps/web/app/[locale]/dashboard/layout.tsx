import { getSignedInEmail } from '@/lib/auth/signed-in-email'
import { AppHeader } from '@/components/layout/app-header'

/**
 * Layout for the dashboard route — wraps the page in the shared authenticated
 * chrome. The signed-in user is resolved server-side (the middleware has
 * already refreshed the session) and only the derived identity reaches the bar.
 *
 * @param {object} root0 - Layout props.
 * @param {React.ReactNode} root0.children - The dashboard page content.
 * @returns {Promise<React.ReactElement>} The dashboard wrapped in the app header.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppHeader email={await getSignedInEmail()}>{children}</AppHeader>
}
