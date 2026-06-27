import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { SectionHeader } from '@/components/ui/section-header'

export default function RegisterPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6 py-16"
    >
      <SectionHeader
        titleAs="h1"
        marker="/02"
        title="Start a campaign shelf"
        description="The real registration flow will lead into campaign creation and extraction review. For now, this page marks the route without pretending account creation is live."
      />
      <Notice className="mt-8">
        Open beta is approved copy, but account creation is not implemented in
        this block. No campaign data is collected from this placeholder.
      </Notice>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/">Back to landing</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">Sign in instead</Link>
        </Button>
      </div>
    </main>
  )
}
