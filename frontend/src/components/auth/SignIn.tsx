import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import AuthPanel from './AuthPanel'
import { Button } from '../ui/Button'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from =
    (location.state as { from?: string } | null)?.from ?? '/c/new'

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate(from, { replace: true })
    })
    return () => {
      active = false
    }
  }, [from, navigate])

  async function handleSignIn() {
    setError(null)
    setSubmitting(true)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (oauthError) setError(oauthError.message)
    setSubmitting(false)
  }

  return (
    <AuthPanel
      eyebrow="your library is waiting"
      title="Welcome back"
      description="Ask questions about any YouTube video or playlist, grounded in its transcript."
      error={error}
    >
      <Button
        className="w-full"
        onClick={handleSignIn}
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Continue with Google
      </Button>
      <p className="reassurance">Your videos. Your questions. Better answers.</p>
    </AuthPanel>
  )
}
