'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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
   * Handles the logout functionality.
   */
  async function handleLogout() {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
