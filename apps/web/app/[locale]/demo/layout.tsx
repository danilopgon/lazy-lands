import { DemoHeader } from '@/components/demo/demo-header'
import { DemoProvider } from '@/lib/demo/store'

/**
 * Layout for the public `/demo` island. Unlike the dashboard and campaigns
 * layouts, it performs no auth: there is no signed-in user, no Supabase call,
 * and no protected chrome. It wraps every demo screen in the in-memory
 * {@link DemoProvider} and the public {@link DemoHeader}.
 *
 * @param {object} root0 - Layout props.
 * @param {React.ReactNode} root0.children - The demo page content.
 * @returns {React.ReactElement} The demo pages wrapped in the demo shell.
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DemoProvider>
      <DemoHeader />
      {children}
    </DemoProvider>
  )
}
