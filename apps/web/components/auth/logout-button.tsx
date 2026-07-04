'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

/**
 * `LogoutButton` — a button that signs the user out of Supabase auth and
 * redirects to the login page.
 *
 * @returns {React.ReactElement} The logout button element.
 */
export function LogoutButton() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  /**
   * Handles the logout functionality. The Supabase client is created lazily
   * inside the handler (browser-only) and the disabled flag is reset in
   * `finally` so a failed sign-out never leaves the button stuck.
   */
  async function handleLogout() {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing out…' : 'Log out'}
    </Button>
  )
}
